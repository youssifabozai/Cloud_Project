import { Module } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { CloudWatchTaskMetricsService } from './cloudwatch-task-metrics.service';
import { AwsModule } from '../AWS/aws.module';

@Module({
  imports: [AwsModule],
  controllers: [MetricsController],
  providers: [MetricsService, CloudWatchTaskMetricsService],
  exports: [CloudWatchTaskMetricsService],
})
export class MetricsModule {}
