import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role, Roles } from '../common/decorators/roles.decorator';
import { AuditLogsService } from './audit-logs.service';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @Roles(Role.MANAGER, Role.ADMIN)
  findAll(
    @Req() req: { user: { userId: string; role: string; teamId: string } },
    @Query('taskId') taskId?: string,
    @Query('actionType') actionType?: string,
    @Query('userId') userId?: string,
    @Query('teamId') teamId?: string,
  ) {
    return this.auditLogsService.findAllForUser(req.user, {
      taskId,
      actionType,
      userId,
      teamId,
    });
  }

  @Get('team/:teamId/recent')
  findRecentForTeam(
    @Param('teamId') teamId: string,
    @Req() req: { user: { userId: string; role: string; teamId: string } },
  ) {
    return this.auditLogsService.findRecentForTeam(teamId, req.user);
  }
}
