import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { LeaveService } from './leave.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole, LeaveType, User } from '@prisma/client';

@ApiTags('Leave')
@ApiBearerAuth()
@Controller('leave')
export class LeaveController {
  constructor(private readonly service: LeaveService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.HR)
  findAll(@Query() query: any) {
    return this.service.findAll(query);
  }

  @Get('my')
  findMy(@CurrentUser() user: User) {
    return this.service.findMy(user.id);
  }

  @Get('balance')
  getBalance(@CurrentUser() user: User) {
    return this.service.getBalance(user.id);
  }

  @Post()
  apply(
    @CurrentUser() user: User,
    @Body() body: { leaveType: LeaveType; startDate: string; endDate: string; reason: string },
  ) {
    return this.service.apply(user.id, body);
  }

  @Patch(':id/approve')
  @Roles(UserRole.ADMIN, UserRole.HR)
  approve(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() body: { note?: string },
  ) {
    return this.service.approve(id, user.id, body.note);
  }

  @Patch(':id/reject')
  @Roles(UserRole.ADMIN, UserRole.HR)
  reject(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() body: { note: string },
  ) {
    return this.service.reject(id, user.id, body.note);
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.cancel(id, user.id);
  }
}
