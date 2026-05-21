import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { AuthenticationGuard } from '../common/guards/authentication-guard';
import { AuthorizationGuard } from '../common/guards/authorization-guard';
import { Role, Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Controller('projects')
@UseGuards(AuthenticationGuard, AuthorizationGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  createProject(@Body() dto: CreateProjectDto, @CurrentUser() user: any) {
    return this.projectsService.createProject(dto, user);
  }

  @Get()
  getProjects(@CurrentUser() user: any) {
    return this.projectsService.getProjects(user);
  }

  @Get(':projectId')
  getProjectById(@Param('projectId') projectId: string, @CurrentUser() user: any) {
    return this.projectsService.getProjectById(projectId, user);
  }

  @Put(':projectId')
  @Roles(Role.ADMIN, Role.MANAGER)
  updateProject(
    @Param('projectId') projectId: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser() user: any,
  ) {
    return this.projectsService.updateProject(projectId, dto, user);
  }

  @Delete(':projectId')
  @Roles(Role.ADMIN, Role.MANAGER)
  deleteProject(@Param('projectId') projectId: string, @CurrentUser() user: any) {
    return this.projectsService.deleteProject(projectId, user);
  }

  @Post(':projectId/members')
  @Roles(Role.ADMIN, Role.MANAGER)
  assignMember(
    @Param('projectId') projectId: string,
    @Body() body: { memberId: string; type: 'USER' | 'TEAM' },
    @CurrentUser() user: any,
  ) {
    return this.projectsService.assignMember(projectId, body, user);
  }

  @Delete(':projectId/members/:memberId')
  @Roles(Role.ADMIN, Role.MANAGER)
  removeMember(
    @Param('projectId') projectId: string,
    @Param('memberId') memberId: string,
    @Query('type') type: 'USER' | 'TEAM',
    @CurrentUser() user: any,
  ) {
    return this.projectsService.removeMember(projectId, memberId, type || 'USER', user);
  }
}
