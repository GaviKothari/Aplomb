import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/services/storage.service';
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
    private readonly prisma:  PrismaService,
    private readonly storage: StorageService,
    @InjectQueue(DOCUMENT_QUEUE)
    private readonly queue:   Queue,
  ) {}

  async upload(
    caseId:         string,
    file:           Express.Multer.File,
    documentType:   string,
    uploadedById:   string,
    notes?:         string,
  ) {
    const db = this.prisma as any;

    // Verify case exists
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

    // Enqueue background processing
    await this.queue.add(JOB_PROCESS_DOC, { documentId: doc.id, caseId }, {
      attempts:    3,
      backoff:     { type: 'exponential', delay: 5000 },
      removeOnComplete: 100,
      removeOnFail:     50,
    });

    this.logger.log(`[DOCS] Queued processing for ${doc.id} (${file.originalname})`);
    return this.enrich(doc);
  }

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
    await db.caseDocument.update({
      where: { id: documentId },
      data:  { ocrStatus: 'PENDING', extractionStatus: 'PENDING' },
    });
    await this.queue.add(JOB_PROCESS_DOC, { documentId, caseId }, { attempts: 3, backoff: { type: 'fixed', delay: 2000 } });
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
    const url = await this.storage.getSignedUrl(doc.s3Key, 900); // 15 min
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
