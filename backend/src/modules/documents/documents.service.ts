import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/services/storage.service';
import { OcrService } from '../document-processing/ocr/ocr.service';
import { ExtractionService } from '../document-processing/extraction/extraction.service';
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
    private readonly prisma:     PrismaService,
    private readonly storage:    StorageService,
    private readonly ocr:        OcrService,
    private readonly extraction: ExtractionService,
    @InjectQueue(DOCUMENT_QUEUE)
    private readonly queue:      Queue,
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
    this.processInline(doc.id, caseId, file.buffer, file.mimetype).catch(err => {
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
    documentId: string,
    caseId:     string,
    buffer:     Buffer,
    mimeType:   string,
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

      await db.caseDocument.update({
        where: { id: documentId },
        data:  {
          ocrStatus:        'DONE',
          extractionStatus: 'PROCESSING',
          pageCount:        ocrResult.pages.length,
        },
      });

      const pageTexts = ocrResult.pages.map(p => ({
        pageNumber: p.pageNumber,
        text:       p.text,
        documentId,
      }));
      const extracted = this.extraction.extractFromPages(pageTexts);
      await this.upsertPropertyMaster(caseId, documentId, extracted);

      await db.caseDocument.update({
        where: { id: documentId },
        data:  { extractionStatus: 'DONE' },
      });

      this.logger.log(
        `[DOCS] Inline processed ${documentId} — ${extracted.length} fields, engine: ${ocrResult.engine}`,
      );
    } catch (e: any) {
      this.logger.error(`[DOCS] Inline processing error for ${documentId}: ${e.message}`);
      await db.caseDocument.update({
        where: { id: documentId },
        data:  { ocrStatus: 'FAILED', extractionStatus: 'FAILED' },
      }).catch(() => null);
    }
  }

  private async upsertPropertyMaster(
    caseId:     string,
    documentId: string,
    newFields:  ReturnType<ExtractionService['extractFromPages']>,
  ): Promise<void> {
    const db = this.prisma as any;

    let master = await db.propertyMaster.findUnique({ where: { caseId } });
    if (!master) {
      master = await db.propertyMaster.create({
        data: {
          id:         randomUUID(),
          caseId,
          version:    1,
          status:     'DRAFT',
          masterJson: {},
        },
      });
    }

    for (const f of newFields) {
      const existing = await db.propertyField.findUnique({
        where: { propertyMasterId_fieldKey: { propertyMasterId: master.id, fieldKey: f.fieldKey } },
      });

      if (!existing || (!existing.isManualEdit && Number(existing.confidence) < f.confidence)) {
        await db.propertyField.upsert({
          where:  { propertyMasterId_fieldKey: { propertyMasterId: master.id, fieldKey: f.fieldKey } },
          create: {
            id:               randomUUID(),
            propertyMasterId: master.id,
            fieldKey:         f.fieldKey,
            fieldValue:       f.fieldValue,
            confidence:       f.confidence,
            sourcePage:       f.sourcePage,
            sourceLine:       f.sourceLine,
            sourceDocumentId: documentId,
            isManualEdit:     false,
          },
          update: {
            fieldValue:       f.fieldValue,
            confidence:       f.confidence,
            sourcePage:       f.sourcePage,
            sourceLine:       f.sourceLine,
            sourceDocumentId: documentId,
            isManualEdit:     false,
          },
        });
      }
    }

    const allFields = await db.propertyField.findMany({ where: { propertyMasterId: master.id } });
    const masterJson: Record<string, string> = {};
    for (const f of allFields) {
      if (f.fieldValue) masterJson[f.fieldKey] = f.fieldValue;
    }
    await db.propertyMaster.update({
      where: { id: master.id },
      data:  { masterJson, version: { increment: 1 } },
    });
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
        pages: { select: { pageNumber: true, ocrStatus: true, wordCount: true } },
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

    await db.caseDocument.update({
      where: { id: documentId },
      data:  { ocrStatus: 'PENDING', extractionStatus: 'PENDING' },
    });

    // Download buffer and reprocess inline (no Redis dependency)
    const buffer = await this.storage.downloadBuffer(doc.s3Key);
    if (buffer) {
      this.processInline(documentId, caseId, buffer, doc.mimeType).catch(err => {
        this.logger.error(`[DOCS] Reprocess inline failed for ${documentId}: ${err.message}`);
      });
    }

    // Also try queue as secondary path
    this.queue.add(JOB_PROCESS_DOC, { documentId, caseId }, {
      attempts: 3,
      backoff: { type: 'fixed', delay: 2000 },
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
