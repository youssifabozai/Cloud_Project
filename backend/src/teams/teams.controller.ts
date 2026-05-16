import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './create-team.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role, Roles } from '../common/decorators/roles.decorator';

type AuthenticatedUser = {
  userId: string;
  role: string;
  teamId: string;
  email: string;
};

@ApiTags('Teams')
@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get()
  async getTeams(@CurrentUser() user: AuthenticatedUser) {
    return this.teamsService.getTeams(user);
  }

  @Get(':teamId')
  async getTeamById(
    @Param('teamId') teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.teamsService.getTeamByIdForUser(teamId, user);
  }

  @Delete(':teamId')
  @Roles(Role.ADMIN)
  async deleteTeam(
    @Param('teamId') teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.teamsService.deleteTeam(teamId, user);
  }

  @Post()
  @Roles(Role.ADMIN)
  async createTeam(
    @Body() body: CreateTeamDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.teamsService.createTeam(body, user);
  }
}
