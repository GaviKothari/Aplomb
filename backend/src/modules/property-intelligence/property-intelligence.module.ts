import { Module } from '@nestjs/common';
import { PropertyIntelligenceService } from './property-intelligence.service';
import { PropertyIntelligenceController } from './property-intelligence.controller';
import { PropertyIntelligenceSearchController } from './property-intelligence-search.controller';

@Module({
  controllers: [PropertyIntelligenceController, PropertyIntelligenceSearchController],
  providers:   [PropertyIntelligenceService],
  exports:     [PropertyIntelligenceService],
})
export class PropertyIntelligenceModule {}
