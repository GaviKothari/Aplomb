import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DocumentProcessingModule } from '../document-processing/document-processing.module';
import { StorageService } from '../../common/services/storage.service';

// OcrService and ExtractionService come through DocumentProcessingModule's exports —
// no need to re-declare them here (doing so caused duplicate provider + double onModuleInit).
@Module({
  imports:     [DocumentProcessingModule],
  controllers: [DocumentsController],
  providers:   [DocumentsService, StorageService],
  exports:     [DocumentsService],
})
export class DocumentsModule {}
