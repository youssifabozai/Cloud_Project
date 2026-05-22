import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';

import { UpdateCommentDto } from './dto/update-comment.dto';

@ApiTags('Comments')
@ApiBearerAuth()
@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get(':taskId')
  findByTask(
    @Param('taskId') taskId: string,
    @Req() req: { user: { userId: string; role: string; teamId: string; fullName?: string } },
  ) {
    return this.commentsService.findByTaskId(taskId, req.user);
  }

  @Post()
  create(
    @Body() dto: CreateCommentDto,
    @Req() req: { user: { userId: string; role: string; teamId: string; fullName?: string } },
  ) {
    return this.commentsService.create(dto, req.user);
  }

  @Put(':commentId')
  update(
    @Param('commentId') commentId: string,
    @Body() dto: UpdateCommentDto,
    @Req() req: { user: { userId: string; role: string; teamId: string; fullName?: string } },
  ) {
    return this.commentsService.update(commentId, dto, req.user);
  }

  @Delete(':commentId')
  remove(
    @Param('commentId') commentId: string,
    @Query('taskId') taskId: string,
    @Req() req: { user: { userId: string; role: string; teamId: string; fullName?: string } },
  ) {
    return this.commentsService.remove(commentId, taskId, req.user);
  }
}
