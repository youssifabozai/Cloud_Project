import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AwsService } from '../AWS/aws.service';
import { GetCommand, PutCommand, QueryCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { Role } from '../common/decorators/roles.decorator';

@Injectable()
export class CommentsService {
  private readonly logger = new Logger(CommentsService.name);
  private readonly commentsTableName: string;
  private readonly tasksTableName: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly awsService: AwsService,
  ) {
    this.commentsTableName = this.configService.get<string>('TABLE_COMMENTS') || 'mini-jira-comments';
    this.tasksTableName = this.configService.get<string>('TABLE_TASKS') || 'mini-jira-Tasks';
  }

  private async checkTaskAccess(taskId: string, user: any) {
    // 1. Fetch task
    const command = new GetCommand({
      TableName: this.tasksTableName,
      Key: { id: taskId },
    });
    const result = await this.awsService.dynamoDbDocClient.send(command);
    const task = result.Item;

    if (!task) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }

    // 2. Role-based check
    if (user.role === Role.ADMIN || user.role === Role.MANAGER) {
      return task; // Managers/Admins can see everything
    }

    // 3. Employee isolation check
    if (user.role === Role.EMPLOYEE) {
      // Employees can only access tasks that belong to their team
      if (task.teamId !== user.teamId) {
        throw new ForbiddenException('You do not have access to tasks outside of your team');
      }
    }

    return task;
  }

  async createComment(taskId: string, content: string, user: any) {
    if (!content || !content.trim()) {
      throw new BadRequestException('Comment content cannot be empty');
    }

    // Verify task exists and user has access
    await this.checkTaskAccess(taskId, user);

    const timestamp = new Date().toISOString();
    const commentId = `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const comment = {
      id: commentId,
      taskId,
      authorId: user.userId,
      content,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const command = new PutCommand({
      TableName: this.commentsTableName,
      Item: comment,
    });

    await this.awsService.dynamoDbDocClient.send(command);
    return { success: true, data: comment };
  }

  async getCommentsByTask(taskId: string, user: any) {
    // Verify task access first
    await this.checkTaskAccess(taskId, user);

    // Fetch comments using GSI
    const command = new QueryCommand({
      TableName: this.commentsTableName,
      IndexName: 'taskId-index',
      KeyConditionExpression: 'taskId = :taskId',
      ExpressionAttributeValues: {
        ':taskId': taskId,
      },
    });

    try {
      const result = await this.awsService.dynamoDbDocClient.send(command);
      
      // Sort by createdAt ascending so oldest comments are first
      const comments = result.Items || [];
      comments.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));

      return { success: true, data: comments };
    } catch (error) {
      this.logger.error(`Failed to fetch comments for task ${taskId}`, error);
      throw error;
    }
  }

  async updateComment(commentId: string, content: string, user: any) {
    if (!content || !content.trim()) {
      throw new BadRequestException('Comment content cannot be empty');
    }

    // DynamoDB doesn't easily let us check authorId in ConditionExpression for dynamic roles 
    // without risking ConditionalCheckFailedException if the comment doesn't exist at all.
    // So we fetch it first.
    const getCommand = new GetCommand({
      TableName: this.commentsTableName,
      Key: { id: commentId },
    });
    const getResult = await this.awsService.dynamoDbDocClient.send(getCommand);
    const comment = getResult.Item;

    if (!comment) {
      throw new NotFoundException(`Comment ${commentId} not found`);
    }

    if (comment.authorId !== user.userId) {
      throw new ForbiddenException('You can only update your own comments');
    }

    const command = new UpdateCommand({
      TableName: this.commentsTableName,
      Key: { id: commentId },
      UpdateExpression: 'SET content = :content, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':content': content,
        ':updatedAt': new Date().toISOString(),
      },
      ReturnValues: 'ALL_NEW',
    });

    const result = await this.awsService.dynamoDbDocClient.send(command);
    return { success: true, data: result.Attributes };
  }

  async deleteComment(commentId: string, user: any) {
    const getCommand = new GetCommand({
      TableName: this.commentsTableName,
      Key: { id: commentId },
    });
    const getResult = await this.awsService.dynamoDbDocClient.send(getCommand);
    const comment = getResult.Item;

    if (!comment) {
      throw new NotFoundException(`Comment ${commentId} not found`);
    }

    // Only the author or an ADMIN/MANAGER can delete a comment
    const canDelete = 
      comment.authorId === user.userId || 
      user.role === Role.ADMIN || 
      user.role === Role.MANAGER;

    if (!canDelete) {
      throw new ForbiddenException('You do not have permission to delete this comment');
    }

    const deleteCommand = new DeleteCommand({
      TableName: this.commentsTableName,
      Key: { id: commentId },
    });

    await this.awsService.dynamoDbDocClient.send(deleteCommand);
    return { success: true, message: 'Comment deleted successfully' };
  }
}
