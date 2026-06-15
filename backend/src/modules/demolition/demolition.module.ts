import { Module } from '@nestjs/common';
import { DemolitionController } from './demolition.controller';
import { DemolitionService } from './demolition.service';

@Module({
  controllers: [DemolitionController],
  providers: [DemolitionService],
  exports: [DemolitionService],
})
export class DemolitionModule {}
