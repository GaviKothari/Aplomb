import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/services/storage.service';
import { OcrService } from '../document-processing/ocr/ocr.service';
import { ExtractionService } from '../document-processing/extraction/extraction.service';
import { PropertyMasterService } from '../property-master/property-master.service';
import { DOCUMENT_QUEUE, JOB_PROCESS_DOC } from '../document-processing/document-processing.processor';
import { randomUUID } from 'crypto';

export const DOCUMENT_TYPES = [
  'SALE_DEED', 'REGISTRY', 'AGREEMENT_TO_SELL', 'PREVIOUS_VALUATION',
  'SITE_PLAN', 'BUILDING_PLAN', 'TAX_RECEIPT', 'MUTATION',
  'ALLOTMENT_LETTER', 'POSSESSION_LETTER', 'CHAIN_OF_TITLE',
  'ENCUMBRANCE_CERTIFICATE', 'OCCUPANCY_CERTIFICATE',
  'APPROVED_PLAN', 'COMPLETION_CERTIFICATE', 'OTHER',
] as const;

export type DocumentType = typeof DOCUMENT_TYPES[number];

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly prisma:          PrismaService,
    private readonly storage:         StorageService,
    private readonly ocr:             OcrService,
    private readonly extraction:      ExtractionService,
    private readonly propertyMaster:  PropertyMasterService,
    @InjectQueue(DOCUMENT_QUEUE)
    private readonly queue:           Queue,
  ) {}

  async upload(
    caseId:       string,
    file:         Express.Multer.File,
    documentType: string,
    uploadedById: string,
    notes?:       string,
  ) {
    const db = this.prisma as any;

    const caseObj = await this.prisma.case.findUnique({ where: { id: caseId } });
    if (!caseObj) throw new NotFoundException('Case not found');

    const ext = file.originalname.split('.').pop() ?? 'bin';
    const key = `cases/${caseId}/documents/${randomUUID()}.${ext}`;

    await this.storage.upload(key, file.buffer, file.mimetype);

    const doc = await db.caseDocument.create({
      data: {
        id:               randomUUID(),
        caseId,
        documentType:     documentType ?? 'OTHER',
        originalName:     file.originalname,
        s3Key:            key,
        mimeType:         file.mimetype,
        sizeBytes:        file.size,
        uploadedById,
        notes:            notes ?? null,
        ocrStatus:        'PENDING',
        extractionStatus: 'PENDING',
      },
    });

    // Start inline processing immediately — works even without Redis.
    // Fire-and-forget; the UI polls every 5s to see the updated status.
    this.processInline(doc.id, caseId, file.buffer, file.mimetype, doc.documentType).catch(err => {
      this.logger.error(`[DOCS] Inline processing failed for ${doc.id}: ${err.message}`);
    });

    // Also try to enqueue — when Redis is available the processor acts as a retry fallback.
    // Failures here are non-fatal since inline already handles it.
    this.queue.add(JOB_PROCESS_DOC, { documentId: doc.id, caseId }, {
      attempts:         3,
      backoff:          { type: 'exponential', delay: 5000 },
      removeOnComplete: 100,
      removeOnFail:     50,
    }).catch(err => {
      this.logger.warn(`[DOCS] Queue unavailable (${err.message}) — inline processor covers it`);
    });

    return this.enrich(doc);
  }

  // ── Inline processor (runs in-process, no Redis dependency) ─────────────────

  private async processInline(
    documentId:   string,
    caseId:       string,
    buffer:       Buffer,
    mimeType:     string,
    documentType?: string,
  ): Promise<void> {
    const db = this.prisma as any;

    // Atomic claim: only proceed if still PENDING (queue processor may race us)
    const claimed = await db.caseDocument.updateMany({
      where: { id: documentId, ocrStatus: 'PENDING' },
      data:  { ocrStatus: 'PROCESSING' },
    });
    if (claimed.count === 0) {
      this.logger.log(`[DOCS] ${documentId} already claimed by queue processor — skipping inline`);
      return;
    }

    try {
      const ocrResult = await this.ocr.processBuffer(buffer, mimeType, documentId);

      for (const page of ocrResult.pages) {
        await db.documentPage.upsert({
          where:  { documentId_pageNumber: { documentId, pageNumber: page.pageNumber } },
          create: {
            id:          randomUUID(),
            documentId,
            pageNumber:  page.pageNumber,
            rawText:     page.text,
            ocrStatus:   'DONE',
            ocrEngine:   page.engine,
            wordCount:   page.wordCount,
          },
          update: {
            rawText:   page.text,
            ocrStatus: 'DONE',
            ocrEngine: page.engine,
            wordCount: page.wordCount,
          },
        });
      }

      if (ocrResult.engine === 'needs-tesseract') {
        // Scanned doc — status stays PROCESSING, Tesseract runs truly in background.
        // UI polls every 5s; background task updates DB when done.
        this.logger.log(`[DOCS] ${documentId}: starting Tesseract in background`);
        this.runTesseractBackground(documentId, caseId, buffer, documentType);
        return;
      }

      // Digital PDF — fast path complete
      await db.caseDocument.update({
        where: { id: documentId },
        data:  {
          ocrStatus:        'DONE',
          extractionStatus: 'PROCESSING',
          pageCount:        ocrResult.pages.length || null,
        },
      });

      const pageTexts = ocrResult.pages.map(p => ({
        pageNumber: p.pageNumber,
        text:       p.text,
        documentId,
      }));
      const { fields: extracted, classification } = this.extraction.extractWithClassification(pageTexts, documentType);
      await this.propertyMaster.upsertFromExtraction(caseId, documentId, extracted);

      await db.caseDocument.update({
        where: { id: documentId },
        data:  {
          extractionStatus:          'DONE',
          classifiedType:            classification.documentType,
          classificationConfidence:  classification.confidence,
        },
      });

      this.logger.log(`[DOCS] Inline processed ${documentId} — ${extracted.length} fields`);
    } catch (e: any) {
      this.logger.error(`[DOCS] Inline processing error for ${documentId}: ${e.message}`);
      await db.caseDocument.update({
        where: { id: documentId },
        data:  { ocrStatus: 'FAILED', extractionStatus: 'FAILED' },
      }).catch(() => null);
    }
  }

  private runTesseractBackground(documentId: string, caseId: string, buffer: Buffer, documentType?: string): void {
    Promise.resolve().then(async () => {
      const db = this.prisma as any;
      try {
        const ocrResult = await this.ocr.runTesseract(buffer);

        for (const page of ocrResult.pages) {
          await db.documentPage.upsert({
            where:  { documentId_pageNumber: { documentId, pageNumber: page.pageNumber } },
            create: {
              id:         randomUUID(),
              documentId,
              pageNumber: page.pageNumber,
              rawText:    page.text,
              ocrStatus:  'DONE',
              ocrEngine:  page.engine,
              wordCount:  page.wordCount,
            },
            update: {
              rawText:   page.text,
              ocrStatus: 'DONE',
              ocrEngine: page.engine,
              wordCount: page.wordCount,
            },
          });
        }

        await db.caseDocument.update({
          where: { id: documentId },
          data:  { ocrStatus: 'DONE', extractionStatus: 'PROCESSING', pageCount: ocrResult.pages.length },
        });

        const pageTexts = ocrResult.pages.map(p => ({ pageNumber: p.pageNumber, text: p.text, documentId }));
        const { fields: extracted, classification } = this.extraction.extractWithClassification(pageTexts, documentType);
        await this.propertyMaster.upsertFromExtraction(caseId, documentId, extracted);

        await db.caseDocument.update({
          where: { id: documentId },
          data:  {
            extractionStatus:         'DONE',
            classifiedType:           classification.documentType,
            classificationConfidence: classification.confidence,
          },
        });

        this.logger.log(`[DOCS] Tesseract done for ${documentId} — ${extracted.length} fields`);
      } catch (e: any) {
        this.logger.error(`[DOCS] Tesseract background failed for ${documentId}: ${e.message}`);
        await db.caseDocument.update({
          where: { id: documentId },
          data:  { ocrStatus: 'FAILED', extractionStatus: 'FAILED' },
        }).catch(() => null);
      }
    }).catch(() => null);
  }

  // ── Standard CRUD ────────────────────────────────────────────────────────────

  async listForCase(caseId: string, includeEngineers = false) {
    const db = this.prisma as any;
    const where: any = { caseId };
    if (includeEngineers) where.shareWithEngineer = true;

    const docs = await db.caseDocument.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        pages: { select: { pageNumber: true, ocrStatus: true, wordCount: true, rawText: true } },
      },
    });
    return docs.map((d: any) => this.enrich(d));
  }

  async getOne(documentId: string) {
    const db = this.prisma as any;
    const doc = await db.caseDocument.findUnique({
      where: { id: documentId },
      include: { pages: true },
    });
    if (!doc) throw new NotFoundException('Document not found');
    return this.enrich(doc);
  }

  async updateShareWithEngineer(caseId: string, shareWithEngineer: boolean) {
    const db = this.prisma as any;
    await db.caseDocument.updateMany({
      where: { caseId },
      data:  { shareWithEngineer },
    });
    return { caseId, shareWithEngineer };
  }

  async updateDocumentType(documentId: string, documentType: string) {
    const db = this.prisma as any;
    await db.caseDocument.update({ where: { id: documentId }, data: { documentType } });
    return this.getOne(documentId);
  }

  async reprocess(documentId: string, caseId: string) {
    const db = this.prisma as any;
    const doc = await db.caseDocument.findUnique({ where: { id: documentId } });
    if (!doc) throw new NotFoundException('Document not found');

    // Try to download the file BEFORE changing status.
    // If the file is gone (e.g., ephemeral local storage after deployment), fail immediately
    // so the queue doesn't pick it up and also fail, leaving the doc stuck as FAILED.
    const buffer = await this.storage.downloadBuffer(doc.s3Key);
    if (!buffer) {
      await db.caseDocument.update({
        where: { id: documentId },
        data:  { ocrStatus: 'FAILED', extractionStatus: 'FAILED' },
      });
      this.logger.warn(`[DOCS] Reprocess failed — file not in storage: ${doc.s3Key}. Delete and re-upload.`);
      return { queued: false, error: 'File not found in storage. Please delete and re-upload the document.' };
    }

    await db.caseDocument.update({
      where: { id: documentId },
      data:  { ocrStatus: 'PENDING', extractionStatus: 'PENDING' },
    });

    // Inline processing — runs immediately without Redis
    this.processInline(documentId, caseId, buffer, doc.mimeType, doc.documentType).catch(err => {
      this.logger.error(`[DOCS] Reprocess inline failed for ${documentId}: ${err.message}`);
    });

    // Queue as secondary retry path — only added when file is confirmed downloadable
    this.queue.add(JOB_PROCESS_DOC, { documentId, caseId }, {
      attempts: 3,
      backoff: { type: 'fixed', delay: 5000 },
    }).catch(() => null);

    return { queued: true };
  }

  async delete(documentId: string) {
    const db = this.prisma as any;
    const doc = await db.caseDocument.findUnique({ where: { id: documentId } });
    if (!doc) throw new NotFoundException('Document not found');
    await this.storage.delete(doc.s3Key);
    await db.caseDocument.delete({ where: { id: documentId } });
    return { deleted: true };
  }

  async getSignedUrl(documentId: string): Promise<{ url: string }> {
    const db = this.prisma as any;
    const doc = await db.caseDocument.findUnique({ where: { id: documentId } });
    if (!doc) throw new NotFoundException('Document not found');
    const url = await this.storage.getSignedUrl(doc.s3Key, 900);
    return { url };
  }

  async getShareStatus(caseId: string): Promise<{ shareWithEngineer: boolean }> {
    const db = this.prisma as any;
    const first = await db.caseDocument.findFirst({ where: { caseId } });
    return { shareWithEngineer: first?.shareWithEngineer ?? false };
  }

  private enrich(doc: any) {
    return {
      ...doc,
      previewUrl: doc.mimeType?.startsWith('image/')
        ? this.storage.getPublicUrl(doc.s3Key)
        : null,
    };
  }
}
