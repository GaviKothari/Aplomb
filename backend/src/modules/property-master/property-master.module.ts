import { Module } from '@nestjs/common';
import { PropertyMasterController } from './property-master.controller';
import { PropertyMasterService } from './property-master.service';
import { PropertyFingerprintService } from './property-fingerprint.service';

@Module({
  controllers: [PropertyMasterController],
  providers:   [PropertyMasterService, PropertyFingerprintService],
  exports:     [PropertyMasterService, PropertyFingerprintService],
})
export class PropertyMasterModule {}
