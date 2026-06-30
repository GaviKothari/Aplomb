import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TravelService } from './travel.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole, User } from '@prisma/client';

@ApiTags('Travel Expenses')
@ApiBearerAuth()
@Controller('travel-expenses')
export class TravelController {
  constructor(private readonly service: TravelService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.COORDINATOR, UserRole.ACCOUNTS)
  findAll(@Query() query: any) {
    return this.service.findAll(query);
  }

  @Get('my')
  findMy(@CurrentUser() user: User, @Query() query: { status?: string; month?: string }) {
    return this.service.findMy(user.id, query);
  }

  @Post()
  @Roles(UserRole.ENGINEER, UserRole.ADMIN)
  submit(
    @CurrentUser() user: User,
    @Body() body: { date: string; distanceKm: number; description?: string },
  ) {
    return this.service.submit(user.id, body);
  }

  @Patch(':id/approve')
  @Roles(UserRole.ADMIN, UserRole.HR)
  approve(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.approve(id, user.id);
  }

  @Patch(':id/reject')
  @Roles(UserRole.ADMIN, UserRole.HR)
  reject(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() body: { reason: string },
  ) {
    return this.service.reject(id, user.id, body.reason);
  }
}
