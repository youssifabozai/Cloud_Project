import { Module } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { AwsModule } from '../AWS/aws.module';

@Module({
  imports: [AwsModule],
  controllers: [MetricsController],
  providers: [MetricsService]
})
export class MetricsModule {}
