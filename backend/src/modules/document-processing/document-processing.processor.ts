import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { OcrService } from './ocr/ocr.service';
import { ExtractionService } from './extraction/extraction.service';
import { StorageService } from '../../common/services/storage.service';
import { PropertyMasterService } from '../property-master/property-master.service';

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
    private readonly prisma:          PrismaService,
    private readonly ocr:             OcrService,
    private readonly extraction:      ExtractionService,
    private readonly storage:         StorageService,
    private readonly propertyMaster:  PropertyMasterService,
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

    // Throw on download failure so Bull retries automatically
    const buffer = await this.storage.downloadBuffer(doc.s3Key);
    if (!buffer) {
      await db.caseDocument.update({
        where: { id: documentId },
        data:  { ocrStatus: 'PENDING' },
      }).catch(() => null);
      throw new Error(`Storage unavailable for ${doc.s3Key} — will retry`);
    }

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
      await this.propertyMaster.upsertFromExtraction(caseId, documentId, extracted);

      await db.caseDocument.update({
        where: { id: documentId },
        data:  {
          extractionStatus:         'DONE',
          classifiedType:           classification.documentType,
          classificationConfidence: classification.confidence,
        },
      });

      this.logger.log(`[DOC] ${documentId} done — ${extracted.length} fields`);
    } catch (e: any) {
      this.logger.error(`[DOC] ${documentId} OCR/extraction failed: ${e.message}`);
      await db.caseDocument.update({
        where: { id: documentId },
        data:  { ocrStatus: 'FAILED', extractionStatus: 'FAILED' },
      }).catch(() => null);
    }
  }
}
