import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { AuthenticationGuard } from '../common/guards/authentication-guard';
import { AuthorizationGuard } from '../common/guards/authorization-guard';
import { Role, Roles } from '../common/decorators/roles.decorator';

@Controller('audit-logs')
@UseGuards(AuthenticationGuard, AuthorizationGuard)
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER)
  getAllAuditLogs() {
    return this.auditLogsService.getAllAuditLogs();
  }

  @Get('task/:taskId')
  @Roles(Role.ADMIN, Role.MANAGER)
  getAuditLogsByTask(@Param('taskId') taskId: string) {
    return this.auditLogsService.getAuditLogsByTask(taskId);
  }
}
