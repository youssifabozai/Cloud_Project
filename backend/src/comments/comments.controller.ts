import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { AuthenticationGuard } from '../common/guards/authentication-guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('comments')
@UseGuards(AuthenticationGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post('task/:taskId')
  createComment(
    @Param('taskId') taskId: string,
    @Body('content') content: string,
    @CurrentUser() user: any
  ) {
    return this.commentsService.createComment(taskId, content, user);
  }

  @Get('task/:taskId')
  getCommentsByTask(
    @Param('taskId') taskId: string,
    @CurrentUser() user: any
  ) {
    return this.commentsService.getCommentsByTask(taskId, user);
  }

  @Put(':commentId')
  updateComment(
    @Param('commentId') commentId: string,
    @Body('content') content: string,
    @CurrentUser() user: any
  ) {
    return this.commentsService.updateComment(commentId, content, user);
  }

  @Delete(':commentId')
  deleteComment(
    @Param('commentId') commentId: string,
    @CurrentUser() user: any
  ) {
    return this.commentsService.deleteComment(commentId, user);
  }
}
