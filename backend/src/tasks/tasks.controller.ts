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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { Role, Roles } from '../common/decorators/roles.decorator';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@ApiTags('Tasks')
@ApiBearerAuth()
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

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

  /** After browser PUT to originals/, generate resized/ thumbnail in S3 */
  @Post('process-image')
  processImage(@Body('imageKey') imageKey: string) {
    return this.tasksService.processUploadedImage(imageKey);
  }

  @Get(':taskId/history')
  getHistory(@Param('taskId') taskId: string, @Req() req: any) {
    return this.tasksService.getTaskHistoryForUser(taskId, req.user);
  }

  @Get(':taskId')
  findOne(@Param('taskId') taskId: string, @Req() req: any) {
    return this.tasksService.findOneForUser(taskId, req.user);
  }

  @Post()
  @Roles(Role.MANAGER, Role.ADMIN)
  createTask(@Body() dto: CreateTaskDto, @Req() req: any) {
    return this.tasksService.createTaskForUser(dto, req.user);
  }

  @Put(':taskId')
  @Roles(Role.MANAGER)
  updateTask(
    @Param('taskId') taskId: string,
    @Body() dto: UpdateTaskDto,
    @Req() req: any,
  ) {
    return this.tasksService.updateTaskForUser(taskId, dto, req.user);
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
  @Roles(Role.MANAGER, Role.ADMIN)
  deleteTask(@Param('taskId') taskId: string, @Req() req: any) {
    return this.tasksService.deleteTaskForUser(taskId, req.user);
  }
}
