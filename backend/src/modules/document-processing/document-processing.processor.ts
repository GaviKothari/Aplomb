import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { OcrService } from './ocr/ocr.service';
import { ExtractionService } from './extraction/extraction.service';
import { StorageService } from '../../common/services/storage.service';

export const DOCUMENT_QUEUE  = 'document-processing';
export const JOB_PROCESS_DOC = 'process-document';

export interface ProcessDocumentJob {
  documentId: string;
  caseId:     string;
}

@Processor(DOCUMENT_QUEUE)
export class DocumentProcessingProcessor {
  private readonly logger = new Logger(DocumentProcessingProcessor.name);

  constructor(
    private readonly prisma:     PrismaService,
    private readonly ocr:        OcrService,
    private readonly extraction: ExtractionService,
    private readonly storage:    StorageService,
  ) {}

  @Process(JOB_PROCESS_DOC)
  async processDocument(job: Job<ProcessDocumentJob>): Promise<void> {
    const { documentId, caseId } = job.data;
    const db = this.prisma as any;

    // Atomic claim — inline processor in DocumentsService may have already handled this
    const claimed = await db.caseDocument.updateMany({
      where: { id: documentId, ocrStatus: 'PENDING' },
      data:  { ocrStatus: 'PROCESSING' },
    });
    if (claimed.count === 0) {
      this.logger.log(`[DOC] ${documentId} already handled by inline processor — skipping`);
      return;
    }

    this.logger.log(`[DOC] Queue processor handling ${documentId} (attempt ${job.attemptsMade + 1})`);

    const doc = await db.caseDocument.findUnique({ where: { id: documentId } });
    if (!doc) {
      this.logger.warn(`[DOC] ${documentId} not found in DB — skipping`);
      return;
    }

    // ── Download ─────────────────────────────────────────────────────────────
    // Throw here (do NOT catch) — Bull will retry the job automatically.
    // Only mark as FAILED after all retries are exhausted (via onJobFailed event).
    const buffer = await this.storage.downloadBuffer(doc.s3Key);
    if (!buffer) {
      // Release the claim so the next retry can re-claim it
      await db.caseDocument.update({
        where: { id: documentId },
        data:  { ocrStatus: 'PENDING' },
      }).catch(() => null);
      throw new Error(`Storage unavailable for ${doc.s3Key} — will retry`);
    }

    // ── OCR + Extraction ─────────────────────────────────────────────────────
    try {
      const ocrResult = await this.ocr.processBuffer(buffer, doc.mimeType, documentId);

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
      const { fields: extracted, classification } = this.extraction.extractWithClassification(pageTexts, doc.documentType);
      await this.upsertPropertyMaster(caseId, documentId, extracted);

      await db.caseDocument.update({
        where: { id: documentId },
        data:  {
          extractionStatus:         'DONE',
          classifiedType:           classification.documentType,
          classificationConfidence: classification.confidence,
        },
      });

      this.logger.log(
        `[DOC] ${documentId} done — ${extracted.length} fields, ` +
        `classified: ${classification.documentType} (${Math.round(classification.confidence * 100)}%)`,
      );
    } catch (e: any) {
      // OCR/extraction failure — mark as FAILED immediately (not worth retrying)
      this.logger.error(`[DOC] ${documentId} OCR/extraction failed: ${e.message}`);
      await db.caseDocument.update({
        where: { id: documentId },
        data:  { ocrStatus: 'FAILED', extractionStatus: 'FAILED' },
      }).catch(() => null);
    }
  }

  private async upsertPropertyMaster(
    caseId:     string,
    documentId: string,
    newFields:  ReturnType<ExtractionService['extractWithClassification']>['fields'],
  ): Promise<void> {
    const db = this.prisma as any;

    let master = await db.propertyMaster.findUnique({ where: { caseId } });
    if (!master) {
      master = await db.propertyMaster.create({
        data: { id: randomUUID(), caseId, version: 1, status: 'DRAFT', masterJson: {} },
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
            label:            f.label,
            fieldValue:       f.fieldValue,
            confidence:       f.confidence,
            sourcePage:       f.sourcePage,
            sourceLine:       f.sourceLine,
            sourceDocumentId: documentId,
            isManualEdit:     false,
          },
          update: {
            label:            f.label,
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
}
