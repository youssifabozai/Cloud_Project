import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
} from '@nestjs/common';
import { TasksService } from './tasks.service';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  findAll(@Req() req: any, @Query('teamId') teamId?: string) {
    return this.tasksService.findAllForUser(req.user, teamId);
  }

  @Get(':taskId')
  findOne(@Param('taskId') taskId: string, @Req() req: any) {
    return this.tasksService.findOneForUser(taskId, req.user);
  }

  @Patch(':taskId/status')
  updateStatus(
    @Param('taskId') taskId: string,
    @Body('status') status: string,
    @Req() req: any,
  ) {
    return this.tasksService.updateStatusForUser(taskId, status, req.user);
  }
}