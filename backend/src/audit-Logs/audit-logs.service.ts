import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { AwsService } from '../AWS/aws.service';

export type ActivityActionType =
  | 'STATUS_CHANGED'
  | 'CREATED'
  | 'ASSIGNED'
  | 'COMMENTED'
  | 'DELETED'
  | 'UPDATED';

export type ActivityLogItem = {
  logId: string;
  taskId: string;
  taskTitle: string;
  teamId: string;
  actorUserId: string;
  actorName: string;
  actionType: ActivityActionType;
  message: string;
  createdAt: string;
  fromStatus?: string;
  toStatus?: string;
};

type CurrentUser = {
  userId: string;
  role: string;
  teamId: string;
  fullName?: string;
};

type LogActivityInput = {
  taskId: string;
  taskTitle: string;
  teamId: string;
  actorUserId: string;
  actorName: string;
  actionType: ActivityActionType;
  message: string;
  fromStatus?: string;
  toStatus?: string;
};

@Injectable()
export class AuditLogsService {
  private readonly tableName: string;

  constructor(
    private readonly awsService: AwsService,
    private readonly configService: ConfigService,
  ) {
    this.tableName =
      this.configService.get<string>('TABLE_ACTIVITY_LOG') ||
      'mini-jira-ActivityLog';
  }

  private isManagerOrAdmin(user: CurrentUser): boolean {
    const r = user.role?.toUpperCase();
    return r === 'MANAGER' || r === 'ADMIN';
  }

  async logActivity(input: LogActivityInput): Promise<ActivityLogItem> {
    const item: ActivityLogItem = {
      logId: uuidv4(),
      taskId: input.taskId,
      taskTitle: input.taskTitle,
      teamId: input.teamId,
      actorUserId: input.actorUserId,
      actorName: input.actorName,
      actionType: input.actionType,
      message: input.message,
      createdAt: new Date().toISOString(),
      ...(input.fromStatus ? { fromStatus: input.fromStatus } : {}),
      ...(input.toStatus ? { toStatus: input.toStatus } : {}),
    };

    await this.awsService.dynamoDbDocClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: item,
      }),
    );

    return item;
  }

  async findAllForUser(
    user: CurrentUser,
    filters?: {
      taskId?: string;
      actionType?: string;
      userId?: string;
      teamId?: string;
      limit?: number;
    },
  ): Promise<ActivityLogItem[]> {
    if (!this.isManagerOrAdmin(user)) {
      throw new ForbiddenException(
        'Only managers and admins can view the global audit log.',
      );
    }

    return this.scanLogs(filters);
  }

  async findByTaskId(
    taskId: string,
    user: CurrentUser,
    taskTeamId: string,
  ): Promise<ActivityLogItem[]> {
    if (!this.isManagerOrAdmin(user) && taskTeamId !== user.teamId) {
      throw new ForbiddenException('You cannot view history for another team.');
    }

    return this.scanLogs({ taskId, limit: 100 });
  }

  /** Team-scoped feed for employees on the overview dashboard */
  async findRecentForTeam(
    teamId: string,
    user: CurrentUser,
    limit = 30,
  ): Promise<ActivityLogItem[]> {
    if (!this.isManagerOrAdmin(user) && teamId !== user.teamId) {
      throw new ForbiddenException('You cannot view another team’s activity.');
    }

    return this.scanLogs({ teamId, limit });
  }

  private async scanLogs(filters?: {
    taskId?: string;
    actionType?: string;
    userId?: string;
    teamId?: string;
    limit?: number;
  }): Promise<ActivityLogItem[]> {
    const items: ActivityLogItem[] = [];
    let lastKey: Record<string, unknown> | undefined;

    do {
      const result = await this.awsService.dynamoDbDocClient.send(
        new ScanCommand({
          TableName: this.tableName,
          ExclusiveStartKey: lastKey,
        }),
      );

      if (result.Items?.length) {
        items.push(...(result.Items as ActivityLogItem[]));
      }
      lastKey = result.LastEvaluatedKey;
    } while (lastKey);

    let filtered = items;

    if (filters?.taskId) {
      filtered = filtered.filter((i) => i.taskId === filters.taskId);
    }
    if (filters?.teamId) {
      filtered = filtered.filter((i) => i.teamId === filters.teamId);
    }
    if (filters?.actionType) {
      filtered = filtered.filter(
        (i) => i.actionType === filters.actionType,
      );
    }
    if (filters?.userId) {
      filtered = filtered.filter(
        (i) => i.actorUserId === filters.userId,
      );
    }

    filtered.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const cap = filters?.limit ?? 200;
    return filtered.slice(0, cap);
  }
}
