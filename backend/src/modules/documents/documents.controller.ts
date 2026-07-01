import {
  Controller, Get, Post, Delete, Patch, Param, Body, Query,
  UseInterceptors, UploadedFile, UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService, DOCUMENT_TYPES } from './documents.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cases/:caseId/documents')
export class DocumentsController {
  constructor(private readonly service: DocumentsService) {}

  /** Upload a bank document and enqueue OCR + extraction */
  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
  upload(
    @Param('caseId') caseId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('documentType') documentType: string,
    @Body('notes') notes: string,
    @CurrentUser() user: any,
  ) {
    return this.service.upload(caseId, file, documentType, user.id, notes);
  }

  /** List all documents for a case */
  @Get()
  list(
    @Param('caseId') caseId: string,
    @Query('engineerView') engineerView: string,
  ) {
    return this.service.listForCase(caseId, engineerView === 'true');
  }

  /** Get share-with-engineer status for this case */
  @Get('share-status')
  shareStatus(@Param('caseId') caseId: string) {
    return this.service.getShareStatus(caseId);
  }

  /** Set share-with-engineer for all documents in this case */
  @Patch('share')
  updateShare(
    @Param('caseId') caseId: string,
    @Body('shareWithEngineer') shareWithEngineer: boolean,
  ) {
    return this.service.updateShareWithEngineer(caseId, shareWithEngineer);
  }

  /** Get single document metadata */
  @Get(':documentId')
  getOne(@Param('documentId') documentId: string) {
    return this.service.getOne(documentId);
  }

  /** Get a short-lived signed download URL */
  @Get(':documentId/signed-url')
  signedUrl(@Param('documentId') documentId: string) {
    return this.service.getSignedUrl(documentId);
  }

  /** Update document type label */
  @Patch(':documentId/type')
  updateType(
    @Param('documentId') documentId: string,
    @Body('documentType') documentType: string,
  ) {
    return this.service.updateDocumentType(documentId, documentType);
  }

  /** Re-queue OCR + extraction for a document */
  @Post(':documentId/reprocess')
  reprocess(
    @Param('caseId') caseId: string,
    @Param('documentId') documentId: string,
  ) {
    return this.service.reprocess(documentId, caseId);
  }

  /** Delete document */
  @Delete(':documentId')
  delete(@Param('documentId') documentId: string) {
    return this.service.delete(documentId);
  }

  /** List available document types */
  @Get('meta/types')
  types() {
    return { types: DOCUMENT_TYPES };
  }
}
