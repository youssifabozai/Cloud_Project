import { Controller, Get, Put, Param, Query, UseGuards, Post, Body } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { AuthenticationGuard } from '../common/guards/authentication-guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('notifications')
@UseGuards(AuthenticationGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  getNotifications(
    @CurrentUser() user: any,
    @Query('unreadOnly') unreadOnly: string
  ) {
    const isUnreadOnly = unreadOnly === 'true';
    return this.notificationsService.getNotifications(user.userId, isUnreadOnly);
  }

  @Put('read-all')
  markAllAsRead(@CurrentUser() user: any) {
    return this.notificationsService.markAllAsRead(user.userId);
  }

  @Put(':id/read')
  markAsRead(
    @Param('id') id: string,
    @CurrentUser() user: any
  ) {
    return this.notificationsService.markAsRead(id, user.userId);
  }

  @Post('test-sns')
  testDispatchSns(
    @Body('message') message: string,
    @CurrentUser() user: any
  ) {
    // Utility endpoint to test SNS dispatching manually
    return this.notificationsService.dispatchSnsNotification(message, user.userId);
  }
}
