import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AwsService } from '../AWS/aws.service';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { GetMetricStatisticsCommand } from '@aws-sdk/client-cloudwatch';

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private readonly tasksTableName: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly awsService: AwsService,
  ) {
    this.tasksTableName = this.configService.get<string>('TABLE_TASKS') || 'mini-jira-Tasks';
  }

  private async fetchAllTasks() {
    const tasks: any[] = [];
    let lastEvaluatedKey: Record<string, unknown> | undefined;

    do {
      const command = new ScanCommand({
        TableName: this.tasksTableName,
        ExclusiveStartKey: lastEvaluatedKey,
      });
      const result = await this.awsService.dynamoDbDocClient.send(command);
      if (result.Items?.length) {
        tasks.push(...result.Items);
      }
      lastEvaluatedKey = result.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    return tasks;
  }

  async getDashboardSummary() {
    const tasks = await this.fetchAllTasks();
    const totalTasks = tasks.length;
    let openTasks = 0;
    let closedTasks = 0;

    for (const task of tasks) {
      const s = task.status?.toLowerCase();
      if (s === 'done' || s === 'closed') {
        closedTasks++;
      } else {
        openTasks++;
      }
    }

    let cpuUtilization: number | null = null;
    const ec2InstanceId = this.configService.get<string>('EC2_INSTANCE_ID')?.trim();
    if (ec2InstanceId) {
      try {
        // Fetch average CPU utilization for the last hour.
        const endTime = new Date();
        const startTime = new Date(endTime.getTime() - 60 * 60 * 1000);

        const metricCommand = new GetMetricStatisticsCommand({
          Namespace: 'AWS/EC2',
          MetricName: 'CPUUtilization',
          Dimensions: [
            {
              Name: 'InstanceId',
              Value: ec2InstanceId,
            },
          ],
          StartTime: startTime,
          EndTime: endTime,
          Period: 3600,
          Statistics: ['Average'],
        });

        const metricResult = await this.awsService.cloudWatchClient.send(metricCommand);
        if (metricResult.Datapoints && metricResult.Datapoints.length > 0) {
          cpuUtilization = metricResult.Datapoints[0].Average || 0;
        }
      } catch (error) {
        this.logger.error('Failed to fetch CloudWatch metrics', error);
        // Fail gracefully if permissions or instance ID are missing.
      }
    }

    const closedDurations = tasks
      .filter((task) => {
        const s = task.status?.toLowerCase();
        return (s === 'done' || s === 'closed') && task.createdAt && (task.closedAt || task.updatedAt);
      })
      .map((task) => {
        const createdMs = Date.parse(task.createdAt);
        const closedMs = Date.parse(task.closedAt || task.updatedAt);
        if (!Number.isFinite(createdMs) || !Number.isFinite(closedMs)) {
          return null;
        }
        return Math.max(0, (closedMs - createdMs) / (1000 * 60 * 60));
      })
      .filter((value): value is number => value !== null);

    const averageTimeToCloseHours =
      closedDurations.length > 0
        ? closedDurations.reduce((sum, value) => sum + value, 0) / closedDurations.length
        : null;

    return {
      success: true,
      data: {
        totalTasks,
        openTasks,
        closedTasks,
        cpuUtilization:
          cpuUtilization === null ? null : parseFloat(cpuUtilization.toFixed(2)),
        ec2InstanceIdConfigured: Boolean(ec2InstanceId),
        averageTimeToCloseHours:
          averageTimeToCloseHours === null
            ? null
            : parseFloat(averageTimeToCloseHours.toFixed(2)),
      },
    };
  }

  async getTimeSeries() {
    const tasks = await this.fetchAllTasks();
    const timeSeriesData: Record<string, { created: number; closed: number; closedByTeam: Record<string, number> }> = {};

    for (const task of tasks) {
      // Group by YYYY-MM-DD
      const createdDate = task.createdAt ? new Date(task.createdAt).toISOString().split('T')[0] : 'Unknown';
      if (!timeSeriesData[createdDate]) {
        timeSeriesData[createdDate] = { created: 0, closed: 0, closedByTeam: {} };
      }
      timeSeriesData[createdDate].created++;

      const s = task.status?.toLowerCase();
      if (s === 'done' || s === 'closed') {
        const closedDate = task.updatedAt ? new Date(task.updatedAt).toISOString().split('T')[0] : createdDate;
        if (!timeSeriesData[closedDate]) {
          timeSeriesData[closedDate] = { created: 0, closed: 0, closedByTeam: {} };
        }
        timeSeriesData[closedDate].closed++;
        const teamId = task.teamId || 'Unassigned';
        timeSeriesData[closedDate].closedByTeam[teamId] =
          (timeSeriesData[closedDate].closedByTeam[teamId] || 0) + 1;
      }
    }

    const formatted = Object.keys(timeSeriesData).map((date) => ({
      date,
      ...timeSeriesData[date],
    })).sort((a, b) => a.date.localeCompare(b.date));

    return { success: true, data: formatted };
  }

  async getDistribution() {
    const tasks = await this.fetchAllTasks();
    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};

    for (const task of tasks) {
      const status = task.status || 'UNASSIGNED';
      const priority = task.priority || 'MEDIUM';
      
      byStatus[status] = (byStatus[status] || 0) + 1;
      byPriority[priority] = (byPriority[priority] || 0) + 1;
    }

    return {
      success: true,
      data: {
        byStatus,
        byPriority,
      },
    };
  }

  async getBurndown(projectId: string) {
    const tasks = await this.fetchAllTasks();
    const projectTasks = tasks.filter((t) => t.projectId === projectId);
    
    // Simplistic burndown: Count remaining open tasks per day
    // In a real scenario, this would use sprint start/end dates
    
    return {
      success: true,
      data: {
        projectId,
        totalProjectTasks: projectTasks.length,
        closedProjectTasks: projectTasks.filter(t => {
          const s = t.status?.toLowerCase();
          return s === 'done' || s === 'closed';
        }).length,
      },
    };
  }
}
