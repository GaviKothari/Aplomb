import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole, User } from '@prisma/client';

@ApiTags('Attendance')
@ApiBearerAuth()
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly service: AttendanceService) {}

  @Post('punch-in')
  @ApiOperation({ summary: 'Punch in with GPS — validates geofence' })
  punchIn(@Body() body: { lat: number; lng: number }, @CurrentUser() user: User) {
    return this.service.punchIn(user.id, body.lat, body.lng);
  }

  @Post('punch-out')
  @ApiOperation({ summary: 'Punch out with GPS' })
  punchOut(@Body() body: { lat: number; lng: number }, @CurrentUser() user: User) {
    return this.service.punchOut(user.id, body.lat, body.lng);
  }

  @Get('today')
  @ApiOperation({ summary: "Get today's attendance record" })
  getToday(@CurrentUser() user: User) {
    return this.service.getTodayRecord(user.id);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.HR)
  findAll(@Query() query: any) {
    return this.service.findAll(query);
  }

  @Patch(':id/override')
  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiOperation({ summary: 'Admin override attendance status' })
  override(
    @Param('id') id: string,
    @Body() body: { status: any; reason: string },
    @CurrentUser() user: User,
  ) {
    return this.service.override(id, body.status, body.reason, user.id);
  }
}
