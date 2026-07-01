import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { PropertyIntelligenceService } from './property-intelligence.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('property-intelligence')
export class PropertyIntelligenceSearchController {
  constructor(private readonly service: PropertyIntelligenceService) {}

  /** Live address lookup — used on the new-case form before a caseId exists. */
  @Get('search')
  search(
    @Query('address') address: string,
    @Query('pincode') pincode?: string,
  ) {
    return this.service.searchByAddress(address, pincode);
  }

  /** Backfill all existing cases into property_records. Runs in background. */
  @Post('backfill')
  backfill() {
    return this.service.backfillAll();
  }
}
