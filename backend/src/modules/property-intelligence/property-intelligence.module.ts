import { Module } from '@nestjs/common';
import { PropertyIntelligenceService } from './property-intelligence.service';
import { PropertyIntelligenceController } from './property-intelligence.controller';

@Module({
  controllers: [PropertyIntelligenceController],
  providers:   [PropertyIntelligenceService],
  exports:     [PropertyIntelligenceService],
})
export class PropertyIntelligenceModule {}
