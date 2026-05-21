import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { AuthenticationGuard } from '../common/guards/authentication-guard';
import { AuthorizationGuard } from '../common/guards/authorization-guard';
import { Role, Roles } from '../common/decorators/roles.decorator';

@Controller('metrics')
@UseGuards(AuthenticationGuard, AuthorizationGuard)
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('dashboard/summary')
  @Roles(Role.ADMIN, Role.MANAGER)
  getDashboardSummary() {
    return this.metricsService.getDashboardSummary();
  }

  @Get('visualizations/time-series')
  @Roles(Role.ADMIN, Role.MANAGER)
  getTimeSeries() {
    return this.metricsService.getTimeSeries();
  }

  @Get('visualizations/distribution')
  @Roles(Role.ADMIN, Role.MANAGER)
  getDistribution() {
    return this.metricsService.getDistribution();
  }

  @Get('visualizations/burndown')
  @Roles(Role.ADMIN, Role.MANAGER)
  getBurndown(@Query('projectId') projectId: string) {
    return this.metricsService.getBurndown(projectId);
  }
}
