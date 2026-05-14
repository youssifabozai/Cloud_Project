import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './create-team.dto';
import { CurrentUser } from '../common/guards/decorators/current-user.decorator';
import { Roles } from '../common/guards/decorators/roles.decorator';

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

  @Post()
  @Roles('ADMIN')
  async createTeam(
    @Body() body: CreateTeamDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.teamsService.createTeam(body, user);
  }
}
