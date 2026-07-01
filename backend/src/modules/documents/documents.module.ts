import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DocumentProcessingModule } from '../document-processing/document-processing.module';
import { StorageService } from '../../common/services/storage.service';
import { OcrService } from '../document-processing/ocr/ocr.service';
import { ExtractionService } from '../document-processing/extraction/extraction.service';

@Module({
  imports:     [DocumentProcessingModule],
  controllers: [DocumentsController],
  providers:   [DocumentsService, StorageService, OcrService, ExtractionService],
  exports:     [DocumentsService],
})
export class DocumentsModule {}
