import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { AuditLogsModule } from '../audit-Logs/audit-logs.module';
import { MetricsModule } from '../metrics/metrics.module';

@Module({
  imports: [AuditLogsModule, MetricsModule],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
