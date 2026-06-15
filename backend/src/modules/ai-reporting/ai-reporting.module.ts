import { Module } from '@nestjs/common';
import { AiReportingController } from './ai-reporting.controller';
import { AiReportingService } from './ai-reporting.service';

@Module({
  controllers: [AiReportingController],
  providers: [AiReportingService],
  exports: [AiReportingService],
})
export class AiReportingModule {}
