import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { OcrService } from './ocr/ocr.service';
import { ExtractionService } from './extraction/extraction.service';
import { StorageService } from '../../common/services/storage.service';

export const DOCUMENT_QUEUE    = 'document-processing';
export const JOB_PROCESS_DOC   = 'process-document';

export interface ProcessDocumentJob {
  documentId: string;
  caseId: string;
}

@Processor(DOCUMENT_QUEUE)
export class DocumentProcessingProcessor {
  private readonly logger = new Logger(DocumentProcessingProcessor.name);

  constructor(
    private readonly prisma:      PrismaService,
    private readonly ocr:         OcrService,
    private readonly extraction:  ExtractionService,
    private readonly storage:     StorageService,
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

    this.logger.log(`[DOC] Queue processor handling ${documentId}`);

    try {

      // 2 ── Fetch document metadata
      const doc = await db.caseDocument.findUnique({ where: { id: documentId } });
      if (!doc) throw new Error(`Document ${documentId} not found`);

      // 3 ── Download file from R2
      const buffer = await this.storage.downloadBuffer(doc.s3Key);
      if (!buffer) throw new Error(`Failed to download ${doc.s3Key}`);

      // 4 ── OCR
      const ocrResult = await this.ocr.processBuffer(buffer, doc.mimeType, documentId);

      // 5 ── Persist pages
      for (const page of ocrResult.pages) {
        await db.documentPage.upsert({
          where:  { documentId_pageNumber: { documentId, pageNumber: page.pageNumber } },
          create: {
            id:          require('crypto').randomUUID(),
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

      // 6 ── Mark OCR done
      await db.caseDocument.update({
        where: { id: documentId },
        data:  {
          ocrStatus:    'DONE',
          extractionStatus: 'PROCESSING',
          pageCount:    ocrResult.pages.length,
        },
      });

      // 7 ── Run deterministic extraction
      const pageTexts = ocrResult.pages.map(p => ({
        pageNumber:  p.pageNumber,
        text:        p.text,
        documentId,
      }));
      const extracted = this.extraction.extractFromPages(pageTexts);

      // 8 ── Upsert PropertyMaster + merge fields
      await this.upsertPropertyMaster(caseId, documentId, extracted);

      // 9 ── Mark extraction done
      await db.caseDocument.update({
        where: { id: documentId },
        data:  { extractionStatus: 'DONE' },
      });

      this.logger.log(`[DOC] ${documentId} done — ${extracted.length} fields extracted`);
    } catch (e: any) {
      this.logger.error(`[DOC] ${documentId} failed: ${e.message}`);
      await (this.prisma as any).caseDocument.update({
        where: { id: documentId },
        data:  { ocrStatus: 'FAILED', extractionStatus: 'FAILED' },
      }).catch(() => null);
    }
  }

  private async upsertPropertyMaster(
    caseId: string,
    documentId: string,
    newFields: ReturnType<ExtractionService['extractFromPages']>,
  ): Promise<void> {
    const db = this.prisma as any;

    // Find or create property master for this case
    let master = await db.propertyMaster.findUnique({ where: { caseId } });
    if (!master) {
      master = await db.propertyMaster.create({
        data: {
          id:        require('crypto').randomUUID(),
          caseId,
          version:   1,
          status:    'DRAFT',
          masterJson: {},
        },
      });
    }

    // Upsert each extracted field — only overwrite if new confidence is higher
    for (const f of newFields) {
      const existing = await db.propertyField.findUnique({
        where: { propertyMasterId_fieldKey: { propertyMasterId: master.id, fieldKey: f.fieldKey } },
      });

      if (!existing || (!existing.isManualEdit && Number(existing.confidence) < f.confidence)) {
        await db.propertyField.upsert({
          where:  { propertyMasterId_fieldKey: { propertyMasterId: master.id, fieldKey: f.fieldKey } },
          create: {
            id:               require('crypto').randomUUID(),
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

    // Rebuild masterJson from all current fields
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
