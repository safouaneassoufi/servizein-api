import { Controller, Get, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private service: NotificationsService) {}

  @Get()
  findAll(@CurrentUser() user: any, @Query('unread') unread?: string) {
    return this.service.findAll(user.userId, unread === 'true');
  }

  @Get('unread-count')
  unreadCount(@CurrentUser() user: any) {
    return this.service.getUnreadCount(user.userId);
  }

  @Patch(':id/read')
  markRead(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.markRead(user.userId, id);
  }

  @Patch('read-all')
  markAllRead(@CurrentUser() user: any) {
    return this.service.markAllRead(user.userId);
  }
}
