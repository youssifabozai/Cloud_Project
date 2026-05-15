import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TasksService } from './tasks.service';

@Controller('tasks')
@UseGuards(AuthGuard('jwt'))
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  findAll(@Req() req, @Query('teamId') teamId?: string) {
    return this.tasksService.findAllForUser(req.user, teamId);
  }

  @Get(':taskId')
  findOne(@Param('taskId') taskId: string, @Req() req) {
    return this.tasksService.findOneForUser(taskId, req.user);
  }

  @Patch(':taskId/status')
updateStatus(
  @Param('taskId') taskId: string,
  @Body('status') status: string,
  @Req() req,
) {
  return this.tasksService.updateStatusForUser(taskId, status, req.user);
}


}