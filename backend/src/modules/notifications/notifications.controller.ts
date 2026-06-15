import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '@prisma/client';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get notifications for current user' })
  getMyNotifications(@CurrentUser() user: User, @Query('page') page?: number) {
    return this.service.getForUser(user.id, +page || 1);
  }

  @Post(':id/read')
  markRead(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.markRead(id, user.id);
  }

  @Post('read-all')
  markAllRead(@CurrentUser() user: User) {
    return this.service.markAllRead(user.id);
  }
}
