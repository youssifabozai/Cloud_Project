import { Controller, Delete, Get, Param, Put, Body, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CurrentUser } from '../common/guards/decorators/current-user.decorator';
import { Roles } from '../common/guards/decorators/roles.decorator';
import { UpdateProfileDto } from './update-profile.dto';
import { UpdateTeamDto } from './update-team.dto';
import { UpdateRoleDto } from './update-role.dto';

type AuthenticatedUser = {
  userId: string;
  role: string;
  teamId: string;
  email: string;
};

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async getUsers(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getUsers(user);
  }

  @Get('me')
  async getCurrentUserProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getCurrentUserProfile(user);
  }

  @Get('org-chart')
  async getOrgChart(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getOrgChart(user);
  }

  @Get('team/:teamId')
  @Roles('ADMIN', 'MANAGER')
  async getUsersByTeam(
    @Param('teamId') teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.getUsersForTeam(teamId, user);
  }

  @Put(':userId/profile')
  async updateProfile(
    @Param('userId') userId: string,
    @Body() body: UpdateProfileDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.updateUserProfile(userId, user, body);
  }

  @Put(':userId/team')
  @Roles('ADMIN')
  async assignTeam(
    @Param('userId') userId: string,
    @Body() body: UpdateTeamDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.assignUserToTeam(userId, body.teamId, user);
  }

  @Put(':userId/role')
  @Roles('ADMIN')
  async updateRole(
    @Param('userId') userId: string,
    @Body() body: UpdateRoleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.assignUserRole(userId, body.role, user);
  }

  @Delete(':userId')
  @Roles('ADMIN')
  async deleteUser(
    @Param('userId') userId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.removeUser(userId, user);
  }

  @Post('admin')
  @Roles('ADMIN')
  async elevateToAdmin(
    @Body('userId') userId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.elevateToAdmin(userId, user);
  }
}
