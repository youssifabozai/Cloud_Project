import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AwsService } from '../AWS/aws.service';
import { ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);
  private readonly auditLogsTableName: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly awsService: AwsService,
  ) {
    this.auditLogsTableName = this.configService.get<string>('TABLE_ACTIVITY_LOG') || 'mini-jira-ActivityLog';
  }

  async getAllAuditLogs() {
    try {
      const logs: any[] = [];
      let lastEvaluatedKey: Record<string, unknown> | undefined;

      do {
        const command = new ScanCommand({
          TableName: this.auditLogsTableName,
          ExclusiveStartKey: lastEvaluatedKey,
        });
        const result = await this.awsService.dynamoDbDocClient.send(command);
        if (result.Items?.length) {
          logs.push(...result.Items);
        }
        lastEvaluatedKey = result.LastEvaluatedKey;
      } while (lastEvaluatedKey);

      // Sort logs by newest first
      logs.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
      return { success: true, data: logs };
    } catch (error) {
      this.logger.error('Failed to fetch all audit logs', error);
      throw error;
    }
  }

  async getAuditLogsByTask(taskId: string) {
    try {
      const command = new QueryCommand({
        TableName: this.auditLogsTableName,
        IndexName: 'taskId-index',
        KeyConditionExpression: 'taskId = :taskId',
        ExpressionAttributeValues: {
          ':taskId': taskId,
        },
      });

      const result = await this.awsService.dynamoDbDocClient.send(command);
      
      const logs = result.Items || [];
      // Sort logs by newest first
      logs.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
      
      return { success: true, data: logs };
    } catch (error) {
      this.logger.error(`Failed to fetch audit logs for task ${taskId}`, error);
      throw error;
    }
  }
}
