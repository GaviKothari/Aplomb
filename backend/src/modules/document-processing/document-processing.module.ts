import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { DOCUMENT_QUEUE } from './document-processing.processor';
import { DocumentProcessingProcessor } from './document-processing.processor';
import { OcrService } from './ocr/ocr.service';
import { ExtractionService } from './extraction/extraction.service';
import { StorageService } from '../../common/services/storage.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: DOCUMENT_QUEUE }),
  ],
  providers: [
    DocumentProcessingProcessor,
    OcrService,
    ExtractionService,
    StorageService,
  ],
  exports: [
    BullModule,
    OcrService,
    ExtractionService,
  ],
})
export class DocumentProcessingModule {}
