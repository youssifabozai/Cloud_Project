import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { AuditLogsModule } from '../audit-Logs/audit-logs.module';
import { MetricsModule } from '../metrics/metrics.module';
import { AwsModule } from '../AWS/aws.module';

@Module({
  imports: [AuditLogsModule, MetricsModule, AwsModule],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
