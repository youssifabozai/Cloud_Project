import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { TasksService } from './tasks.service';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) { }

  @Post()
  create(@Body() body: any, @Req() req: any) {
    return this.tasksService.createForUser(body, req.user);
  }

  @Get()
  findAll(@Req() req: any, @Query('teamId') teamId?: string) {
    return this.tasksService.findAllForUser(req.user, teamId);
  }

  @Get(':taskId')
  findOne(@Param('taskId') taskId: string, @Req() req: any) {
    return this.tasksService.findOneForUser(taskId, req.user);
  }

  @Get(':taskId/history')
  history(@Param('taskId') taskId: string, @Req() req: any) {
    return this.tasksService.findHistoryForUser(taskId, req.user);
  }

  @Patch(':taskId/status')
  updateStatus(
    @Param('taskId') taskId: string,
    @Body('status') status: string,
    @Req() req: any,
  ) {
    return this.tasksService.updateStatusForUser(taskId, status, req.user);
  }

  @Patch(':taskId/assign')
  assign(
    @Param('taskId') taskId: string,
    @Body('assigneeId') assigneeId: string,
    @Req() req: any,
  ) {
    return this.tasksService.assignForUser(taskId, assigneeId, req.user);
  }

  @Patch(':taskId')
  update(
    @Param('taskId') taskId: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    return this.tasksService.updateForUser(taskId, body, req.user);
  }

  @Delete(':taskId')
  remove(@Param('taskId') taskId: string, @Req() req: any) {
    return this.tasksService.deleteForUser(taskId, req.user);
  }
}
