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
      if (task.status === 'DONE' || task.status === 'CLOSED') {
        closedTasks++;
      } else {
        openTasks++;
      }
    }

    let cpuUtilization = 0;
    try {
      // Fetch average CPU utilization for the last hour
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 60 * 60 * 1000); // 1 hour ago
      
      const metricCommand = new GetMetricStatisticsCommand({
        Namespace: 'AWS/EC2',
        MetricName: 'CPUUtilization',
        Dimensions: [
          {
            Name: 'InstanceId',
            Value: this.configService.get<string>('EC2_INSTANCE_ID') || 'i-placeholder',
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
      // Fail gracefully if permissions or instance ID are missing
    }

    return {
      success: true,
      data: {
        totalTasks,
        openTasks,
        closedTasks,
        cpuUtilization: parseFloat(cpuUtilization.toFixed(2)),
      },
    };
  }

  async getTimeSeries() {
    const tasks = await this.fetchAllTasks();
    const timeSeriesData: Record<string, { created: number; closed: number }> = {};

    for (const task of tasks) {
      // Group by YYYY-MM-DD
      const createdDate = task.createdAt ? new Date(task.createdAt).toISOString().split('T')[0] : 'Unknown';
      if (!timeSeriesData[createdDate]) {
        timeSeriesData[createdDate] = { created: 0, closed: 0 };
      }
      timeSeriesData[createdDate].created++;

      if (task.status === 'DONE' || task.status === 'CLOSED') {
        const closedDate = task.updatedAt ? new Date(task.updatedAt).toISOString().split('T')[0] : createdDate;
        if (!timeSeriesData[closedDate]) {
          timeSeriesData[closedDate] = { created: 0, closed: 0 };
        }
        timeSeriesData[closedDate].closed++;
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
        closedProjectTasks: projectTasks.filter(t => t.status === 'DONE' || t.status === 'CLOSED').length,
      },
    };
  }
}
