import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { AwsService } from '../AWS/aws.service';
import { AuditLogsService } from '../audit-Logs/audit-logs.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

type CurrentUser = {
  userId: string;
  role: string;
  teamId: string;
  fullName?: string;
};

export type CommentItem = {
  commentId: string;
  taskId: string;
  teamId: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string;
  updatedAt?: string;
};

@Injectable()
export class CommentsService {
  private readonly commentsTableName: string;
  private readonly tasksTableName: string;

  constructor(
    private readonly awsService: AwsService,
    private readonly configService: ConfigService,
    private readonly auditLogsService: AuditLogsService,
  ) {
    this.commentsTableName =
      this.configService.get<string>('TABLE_COMMENTS') || 'mini-jira-comments';
    this.tasksTableName =
      this.configService.get<string>('TABLE_TASKS') || 'mini-jira-Tasks';
  }

  private isManagerOrAdmin(user: CurrentUser): boolean {
    const r = user.role?.toUpperCase();
    return r === 'MANAGER' || r === 'ADMIN';
  }

  private async getTaskForAccess(taskId: string) {
    const result = await this.awsService.dynamoDbDocClient.send(
      new GetCommand({
        TableName: this.tasksTableName,
        Key: { taskId },
      }),
    );

    if (!result.Item) {
      throw new NotFoundException('Task not found.');
    }

    return result.Item as {
      taskId: string;
      title: string;
      teamId: string;
    };
  }

  private assertTeamAccess(user: CurrentUser, taskTeamId: string) {
    if (!this.isManagerOrAdmin(user) && taskTeamId !== user.teamId) {
      throw new ForbiddenException('You cannot access this team’s task.');
    }
  }

  async findByTaskId(taskId: string, user: CurrentUser): Promise<CommentItem[]> {
    const task = await this.getTaskForAccess(taskId);
    this.assertTeamAccess(user, task.teamId);

    let items: CommentItem[] = [];

    try {
      const result = await this.awsService.dynamoDbDocClient.send(
        new QueryCommand({
          TableName: this.commentsTableName,
          KeyConditionExpression: 'taskId = :taskId',
          ExpressionAttributeValues: { ':taskId': taskId },
        }),
      );
      items = (result.Items || []) as CommentItem[];
    } catch {
      const scan = await this.awsService.dynamoDbDocClient.send(
        new ScanCommand({
          TableName: this.commentsTableName,
          FilterExpression: 'taskId = :taskId',
          ExpressionAttributeValues: { ':taskId': taskId },
        }),
      );
      items = (scan.Items || []) as CommentItem[];
    }
    items.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    return items;
  }

  async create(dto: CreateCommentDto, user: CurrentUser): Promise<CommentItem> {
    const task = await this.getTaskForAccess(dto.taskId);
    this.assertTeamAccess(user, task.teamId);

    const now = new Date().toISOString();
    const actorName = user.fullName || user.userId;

    const item: CommentItem = {
      commentId: uuidv4(),
      taskId: dto.taskId,
      teamId: task.teamId,
      authorId: user.userId,
      authorName: actorName,
      text: dto.text.trim(),
      createdAt: now,
    };

    await this.awsService.dynamoDbDocClient.send(
      new PutCommand({
        TableName: this.commentsTableName,
        Item: item,
      }),
    );

    await this.auditLogsService.logActivity({
      taskId: task.taskId,
      taskTitle: task.title,
      teamId: task.teamId,
      actorUserId: user.userId,
      actorName,
      actionType: 'COMMENTED',
      message: `${actorName} commented on ${task.title}`,
    });

    return item;
  }

  async update(
    commentId: string,
    dto: UpdateCommentDto,
    user: CurrentUser,
  ): Promise<CommentItem> {
    const existing = await this.getCommentRecord(dto.taskId, commentId);
    const task = await this.getTaskForAccess(dto.taskId);
    this.assertTeamAccess(user, task.teamId);

    if (
      existing.authorId !== user.userId &&
      !this.isManagerOrAdmin(user)
    ) {
      throw new ForbiddenException('You can only edit your own comments.');
    }

    const now = new Date().toISOString();

    await this.awsService.dynamoDbDocClient.send(
      new UpdateCommand({
        TableName: this.commentsTableName,
        Key: { taskId: dto.taskId, commentId },
        UpdateExpression: 'SET #text = :text, updatedAt = :updatedAt',
        ExpressionAttributeNames: { '#text': 'text' },
        ExpressionAttributeValues: {
          ':text': dto.text.trim(),
          ':updatedAt': now,
        },
      }),
    );

    return { ...existing, text: dto.text.trim(), updatedAt: now };
  }

  async remove(
    commentId: string,
    taskId: string,
    user: CurrentUser,
  ): Promise<{ message: string; commentId: string }> {
    const existing = await this.getCommentRecord(taskId, commentId);
    const task = await this.getTaskForAccess(taskId);
    this.assertTeamAccess(user, task.teamId);

    if (
      existing.authorId !== user.userId &&
      !this.isManagerOrAdmin(user)
    ) {
      throw new ForbiddenException('You can only delete your own comments.');
    }

    await this.awsService.dynamoDbDocClient.send(
      new DeleteCommand({
        TableName: this.commentsTableName,
        Key: { taskId, commentId },
      }),
    );

    return { message: 'Comment deleted.', commentId };
  }

  private async getCommentRecord(
    taskId: string,
    commentId: string,
  ): Promise<CommentItem> {
    const result = await this.awsService.dynamoDbDocClient.send(
      new GetCommand({
        TableName: this.commentsTableName,
        Key: { taskId, commentId },
      }),
    );

    if (!result.Item) {
      throw new NotFoundException('Comment not found.');
    }

    return result.Item as CommentItem;
  }
}
