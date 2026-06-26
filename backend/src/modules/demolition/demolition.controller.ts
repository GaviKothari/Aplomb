import { Controller, Get, Post, Patch, Param, Query, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DemolitionService } from './demolition.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole, User } from '@prisma/client';

@ApiTags('Demolition')
@ApiBearerAuth()
@Controller('demolition')
export class DemolitionController {
  constructor(private readonly service: DemolitionService) {}

  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.HR)
  @ApiOperation({ summary: 'Dashboard stats: totals, zone breakdown, year trend' })
  getStats() {
    return this.service.getStats();
  }

  @Get('zones')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.HR, UserRole.ENGINEER)
  getZones() {
    return this.service.getZones();
  }

  @Get('properties')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.HR)
  @ApiOperation({ summary: 'Paginated list of MCD demolition notices' })
  findAll(@Query() query: any) {
    return this.service.findAll(query);
  }

  @Get('alerts')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.HR)
  @ApiOperation({ summary: 'Alerts: cases matched against demolition DB' })
  getAlerts(@Query() query: any) {
    return this.service.getAlerts(query);
  }

  @Post('check-address')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.HR, UserRole.ENGINEER)
  @ApiOperation({ summary: 'Smart scored address check against demolition DB (used during case creation)' })
  checkAddress(
    @Body() body: { address: string; pincode?: string; ownerName?: string },
  ) {
    return this.service.checkAddress(body);
  }

  @Post('match/:caseId')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  @ApiOperation({ summary: 'Run cross-match for a specific case' })
  matchCase(@Param('caseId') caseId: string) {
    return this.service.matchCase(caseId);
  }

  @Post('match-all')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Bulk cross-match all unscanned cases (async)' })
  matchAll() {
    return this.service.matchAllCases();
  }

  @Post('cleanup-non-delhi')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'One-off: delete false-positive alerts for non-Delhi properties and reset their flags' })
  cleanupNonDelhi() {
    return this.service.cleanupNonDelhiAlerts();
  }

  @Patch('alerts/:id')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  @ApiOperation({ summary: 'Confirm or dismiss a demolition alert' })
  updateAlert(
    @Param('id') id: string,
    @Body() body: { status: 'CONFIRMED' | 'DISMISSED'; reason?: string },
    @CurrentUser() user: User,
  ) {
    return this.service.updateAlertStatus(id, body.status, body.reason, user.id);
  }

  @Post('alerts/:id/feedback')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR, UserRole.HR)
  @ApiOperation({ summary: 'Mark an alert as CORRECT or WRONG match (human feedback loop)' })
  recordFeedback(
    @Param('id') id: string,
    @Body() body: { feedback: 'CORRECT' | 'WRONG' },
    @CurrentUser() user: User,
  ) {
    return this.service.recordFeedback(id, body.feedback, user.id);
  }

  @Get('aliases')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List all address aliases (admin-editable locality map)' })
  getAliases() {
    return this.service.getAliases();
  }

  @Post('aliases')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create or update an address alias' })
  upsertAlias(
    @Body() body: { alias: string; canonical: string; zone?: string },
  ) {
    return this.service.upsertAlias(body.alias, body.canonical, body.zone);
  }

  @Patch('aliases/:alias')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete an address alias' })
  deleteAlias(@Param('alias') alias: string) {
    return this.service.deleteAlias(alias);
  }
}
