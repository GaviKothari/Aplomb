import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MisService } from './mis.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('MIS')
@ApiBearerAuth()
@Controller('mis')
export class MisController {
  constructor(private readonly service: MisService) {}

  @Get('snapshot')
  @ApiOperation({ summary: 'Real-time MIS KPI snapshot' })
  getSnapshot() {
    return this.service.getSnapshot();
  }

  @Get('bank-wise')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  getBankWise(@Query('from') from?: string, @Query('to') to?: string) {
    return this.service.getBankWise(from, to);
  }

  @Get('engineer-performance')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  getEngineerPerformance(@Query('from') from?: string, @Query('to') to?: string) {
    return this.service.getEngineerPerformance(from, to);
  }

  @Get('revenue-trend')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTS)
  getRevenueTrend(@Query('months') months?: number) {
    return this.service.getRevenueTrend(+months || 6);
  }

  @Get('tat-analysis')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  getTatAnalysis() {
    return this.service.getTatAnalysis();
  }

  @Get('monthly-cases')
  @Roles(UserRole.ADMIN, UserRole.COORDINATOR)
  getMonthlyCases(@Query('months') months?: number) {
    return this.service.getMonthlyCases(+months || 12);
  }
}
