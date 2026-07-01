import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { DOCUMENT_QUEUE, DocumentProcessingProcessor } from './document-processing.processor';
import { OcrService } from './ocr/ocr.service';
import { ExtractionService } from './extraction/extraction.service';
import { StorageService } from '../../common/services/storage.service';
import { PropertyMasterModule } from '../property-master/property-master.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: DOCUMENT_QUEUE }),
    PropertyMasterModule,
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
