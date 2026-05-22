import { Controller, Delete, Get, Param, Put, Body, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role, Roles } from '../common/decorators/roles.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

type AuthenticatedUser = {
  userId: string;
  role: string;
  teamId: string;
  email: string;
};

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

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
  @Roles(Role.ADMIN, Role.MANAGER)
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
  @Roles(Role.ADMIN)
  async assignTeam(
    @Param('userId') userId: string,
    @Body() body: UpdateTeamDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.assignUserToTeam(userId, body.teamId, user);
  }

  @Put(':userId/role')
  @Roles(Role.ADMIN)
  async updateRole(
    @Param('userId') userId: string,
    @Body() body: UpdateRoleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.assignUserRole(userId, body.role, user);
  }

  @Delete(':userId')
  @Roles(Role.ADMIN)
  async deleteUser(
    @Param('userId') userId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.removeUser(userId, user);
  }

  @Post('admin')
  @Roles(Role.ADMIN)
  async elevateToAdmin(
    @Body('userId') userId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.elevateToAdmin(userId, user);
  }
}
