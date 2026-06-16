import { Module } from '@nestjs/common';
import { ReportTemplatesController } from './report-templates.controller';
import { ReportTemplatesService } from './report-templates.service';
import { StorageService } from '../../common/services/storage.service';

@Module({
  controllers: [ReportTemplatesController],
  providers: [ReportTemplatesService, StorageService],
  exports: [ReportTemplatesService],
})
export class ReportTemplatesModule {}
