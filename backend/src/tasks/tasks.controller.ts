import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { Role, Roles } from '../common/decorators/roles.decorator';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) { }

  @Get()
  findAll(@Req() req: any, @Query('teamId') teamId?: string) {
    return this.tasksService.findAllForUser(req.user, teamId);
  }

  @Get('upload-url')
  getUploadUrl(
    @Query('fileName') fileName: string,
    @Query('contentType') contentType: string,
  ) {
    return this.tasksService.generateUploadUrl(fileName, contentType);
  }

  @Get(':taskId')
  findOne(@Param('taskId') taskId: string, @Req() req: any) {
    return this.tasksService.findOneForUser(taskId, req.user);
  }

  @Post()
  @Roles(Role.MANAGER)
  createTask(@Body() body: Record<string, any>, @Req() req: any) {
    return this.tasksService.createTaskForUser(body, req.user);
  }

  @Put(':taskId')
  @Roles(Role.MANAGER)
  updateTask(
    @Param('taskId') taskId: string,
    @Body() body: Record<string, any>,
    @Req() req: any,
  ) {
    return this.tasksService.updateTaskForUser(taskId, body, req.user);
  }

  @Patch(':taskId/status')
  updateStatus(
    @Param('taskId') taskId: string,
    @Body('status') status: string,
    @Req() req: any,
  ) {
    return this.tasksService.updateStatusForUser(taskId, status, req.user);
  }

  @Delete(':taskId')
  @Roles(Role.MANAGER)
  deleteTask(@Param('taskId') taskId: string, @Req() req: any) {
    return this.tasksService.deleteTaskForUser(taskId, req.user);
  }
}