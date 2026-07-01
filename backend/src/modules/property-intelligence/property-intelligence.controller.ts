import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { PropertyIntelligenceService } from './property-intelligence.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cases/:caseId/intelligence')
export class PropertyIntelligenceController {
  constructor(private readonly service: PropertyIntelligenceService) {}

  /** Returns tiered property matches for a case. */
  @Get()
  findMatches(@Param('caseId') caseId: string) {
    return this.service.findMatches(caseId);
  }

  /** Manually trigger indexing (useful for backfilling existing cases). */
  @Post('index')
  index(@Param('caseId') caseId: string) {
    return this.service.indexCase(caseId).then(() => ({ ok: true }));
  }
}
