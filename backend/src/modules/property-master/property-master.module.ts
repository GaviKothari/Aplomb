import { Module } from '@nestjs/common';
import { PropertyMasterController } from './property-master.controller';
import { PropertyMasterService } from './property-master.service';

@Module({
  controllers: [PropertyMasterController],
  providers:   [PropertyMasterService],
  exports:     [PropertyMasterService],
})
export class PropertyMasterModule {}
