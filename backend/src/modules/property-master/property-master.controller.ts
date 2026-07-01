import {
  Controller, Get, Post, Patch, Delete, Param, Body, UseGuards,
} from '@nestjs/common';
import { PropertyMasterService } from './property-master.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cases/:caseId/property-master')
export class PropertyMasterController {
  constructor(private readonly service: PropertyMasterService) {}

  /** Get or create property master for a case */
  @Get()
  get(@Param('caseId') caseId: string) {
    return this.service.getOrCreateForCase(caseId);
  }

  /** Update or add a single field (creates master if missing) */
  @Patch('fields')
  updateField(
    @Param('caseId') caseId: string,
    @Body() body: { fieldKey: string; fieldValue: string },
    @CurrentUser() user: any,
  ) {
    return this.service.updateField(caseId, { ...body, userId: user.id });
  }

  /** Delete a field */
  @Delete('fields/:fieldKey')
  deleteField(
    @Param('caseId') caseId: string,
    @Param('fieldKey') fieldKey: string,
    @CurrentUser() user: any,
  ) {
    return this.service.deleteField(caseId, fieldKey, user.id);
  }

  /** Update master status: DRAFT → REVIEWED → CONFIRMED */
  @Patch('status')
  updateStatus(
    @Param('caseId') caseId: string,
    @Body('status') status: 'DRAFT' | 'REVIEWED' | 'CONFIRMED',
    @CurrentUser() user: any,
  ) {
    return this.service.updateStatus(caseId, status, user.id);
  }

  /** Full edit history */
  @Get('history')
  history(@Param('caseId') caseId: string) {
    return this.service.getHistory(caseId);
  }
}
