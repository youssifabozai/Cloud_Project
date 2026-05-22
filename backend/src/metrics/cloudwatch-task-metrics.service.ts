import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  MetricDatum,
  PutMetricDataCommand,
} from '@aws-sdk/client-cloudwatch';
import { AwsService } from '../AWS/aws.service';

export const DEFAULT_CLOUDWATCH_TASK_NAMESPACE = 'MiniJira';

@Injectable()
export class CloudWatchTaskMetricsService {
  private readonly logger = new Logger(CloudWatchTaskMetricsService.name);
  private readonly namespace: string;
  private readonly enabled: boolean;

  constructor(
    private readonly awsService: AwsService,
    private readonly configService: ConfigService,
  ) {
    this.namespace =
      this.configService.get<string>('CLOUDWATCH_METRICS_NAMESPACE') ||
      DEFAULT_CLOUDWATCH_TASK_NAMESPACE;
    const flag = this.configService.get<string>('CLOUDWATCH_METRICS_ENABLED');
    this.enabled = flag === undefined || flag === '' || flag === 'true';
  }

  async recordTaskCreated(teamId?: string): Promise<void> {
    await this.putCount('TasksCreated', 1, teamId);
  }

  async recordTaskClosed(
    teamId: string | undefined,
    createdAt: string,
    closedAt: string,
  ): Promise<void> {
    await this.putCount('TasksClosed', 1, teamId);

    const createdMs = Date.parse(createdAt);
    const closedMs = Date.parse(closedAt);
    if (!Number.isFinite(createdMs) || !Number.isFinite(closedMs)) {
      return;
    }

    const hoursToClose = Math.max(0, (closedMs - createdMs) / (1000 * 60 * 60));
    await this.putValue('AverageTimeToClose', hoursToClose, teamId, 'None');
  }

  private teamDimension(teamId?: string) {
    if (!teamId) return undefined;
    return [{ Name: 'Team', Value: teamId }];
  }

  private async putCount(
    metricName: string,
    value: number,
    teamId?: string,
  ): Promise<void> {
    await this.putValue(metricName, value, teamId, 'Count');
  }

  private async putValue(
    metricName: string,
    value: number,
    teamId: string | undefined,
    unit: 'Count' | 'None',
  ): Promise<void> {
    if (!this.enabled) return;

    const timestamp = new Date();
    const metricData: MetricDatum[] = [
      {
        MetricName: metricName,
        Value: value,
        Unit: unit,
        Timestamp: timestamp,
      },
    ];

    const teamDims = this.teamDimension(teamId);
    if (teamDims) {
      metricData.push({
        MetricName: metricName,
        Value: value,
        Unit: unit,
        Timestamp: timestamp,
        Dimensions: teamDims,
      });
    }

    try {
      await this.awsService.cloudWatchClient.send(
        new PutMetricDataCommand({
          Namespace: this.namespace,
          MetricData: metricData,
        }),
      );
    } catch (error) {
      this.logger.warn(
        `CloudWatch PutMetricData failed for ${metricName}: ${(error as Error).message}`,
      );
    }
  }
}
