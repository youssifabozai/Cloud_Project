import {
  BadRequestException,
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
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sharp from 'sharp';
import { AwsService } from '../AWS/aws.service';
import { AuditLogsService } from '../audit-Logs/audit-logs.service';
import { CloudWatchTaskMetricsService } from '../metrics/cloudwatch-task-metrics.service';
import { v4 as uuidv4 } from 'uuid';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import {
  assertFileNameMatchesContentType,
  isAllowedImageContentType,
  isValidImageKey,
  toResizedKey,
  ORIGINALS_PREFIX,
} from './tasks-image.util';
import { SnsService } from '../AWS/sns.service';

type CurrentUser = {
  userId: string;
  role: string;
  teamId: string;
  fullName?: string;
};

const PRESIGNED_GET_EXPIRY_SECONDS = 3600;
const PRESIGNED_PUT_EXPIRY_SECONDS = 900;

@Injectable()
export class TasksService {
  private readonly tasksTableName: string;
  private readonly originalsBucketName: string;
  private readonly resizedBucketName: string;

  constructor(
    private readonly awsService: AwsService,
    private readonly configService: ConfigService,
    private readonly auditLogsService: AuditLogsService,
    private readonly snsService: SnsService, // <-- ADD THIS
    private readonly cloudWatchTaskMetrics: CloudWatchTaskMetricsService,
  ) {
    this.tasksTableName =
      this.configService.get<string>('TABLE_TASKS') || 'mini-jira-Tasks';
    this.originalsBucketName =
      this.configService.get<string>('ORIGINAL_IMAGES_BUCKET') ||
      'original-images';
    this.resizedBucketName =
      this.configService.get<string>('RESIZED_IMAGES_BUCKET') ||
      'resized-images';
  }

  private isManagerOrAdmin(user: CurrentUser): boolean {
    const r = user.role?.toUpperCase();
    return r === 'MANAGER' || r === 'ADMIN';
  }

  private isManager(user: CurrentUser): boolean {
    return user.role?.toUpperCase() === 'MANAGER';
  }

  private async enrichTaskWithImageUrls(
    task: Record<string, any>,
  ): Promise<Record<string, any>> {
    if (!task?.imageKey || !isValidImageKey(task.imageKey)) {
      return task;
    }

    const resizedKey = toResizedKey(task.imageKey);

    const imageUrl = await getSignedUrl(
      this.awsService.s3Client,
      new GetObjectCommand({
        Bucket: this.originalsBucketName,
        Key: task.imageKey,
      }),
      { expiresIn: PRESIGNED_GET_EXPIRY_SECONDS },
    );

    let thumbnailUrl: string | undefined;
    if (await this.resizedObjectExists(resizedKey)) {
      thumbnailUrl = await getSignedUrl(
        this.awsService.s3Client,
        new GetObjectCommand({
          Bucket: this.resizedBucketName,
          Key: resizedKey,
        }),
        { expiresIn: PRESIGNED_GET_EXPIRY_SECONDS },
      );
    }

    return {
      ...task,
      imageUrl,
      thumbnailUrl,
      resizedKey,
    };
  }

  private async enrichTasks(
    items: Record<string, any>[],
  ): Promise<Record<string, any>[]> {
    return Promise.all(items.map((t) => this.enrichTaskWithImageUrls(t)));
  }

  async findAllForUser(user: CurrentUser, requestedTeamId?: string) {
    let items: Record<string, any>[];

    if (this.isManagerOrAdmin(user)) {
      if (requestedTeamId) {
        items = await this.findByTeamId(requestedTeamId);
      } else {
        const result = await this.awsService.dynamoDbDocClient.send(
          new ScanCommand({ TableName: this.tasksTableName }),
        );
        items = result.Items || [];
      }
    } else {
      if (!user.teamId) {
        throw new ForbiddenException('Employee does not have a teamId.');
      }
      if (requestedTeamId && requestedTeamId !== user.teamId) {
        throw new ForbiddenException('You cannot view another team’s tasks.');
      }
      items = await this.findByTeamId(user.teamId);
    }

    return this.enrichTasks(items);
  }

  async findOneForUser(taskId: string, user: CurrentUser) {
    const task = await this.getTaskRecord(taskId);

    if (!this.isManagerOrAdmin(user) && task.teamId !== user.teamId) {
      throw new ForbiddenException('You cannot view another team’s task.');
    }

    return this.enrichTaskWithImageUrls(task);
  }

  private async getTaskRecord(taskId: string): Promise<Record<string, any>> {
    const result = await this.awsService.dynamoDbDocClient.send(
      new GetCommand({
        TableName: this.tasksTableName,
        Key: { taskId },
      }),
    );

    if (!result.Item) {
      throw new NotFoundException('Task not found.');
    }

    return result.Item;
  }

  private async findByTeamId(teamId: string) {
    const result = await this.awsService.dynamoDbDocClient.send(
      new QueryCommand({
        TableName: this.tasksTableName,
        IndexName: 'teamId-index',
        KeyConditionExpression: 'teamId = :teamId',
        ExpressionAttributeValues: { ':teamId': teamId },
      }),
    );

    return result.Items || [];
  }

  async generateUploadUrl(fileName: string, contentType: string) {
    if (!fileName?.trim()) {
      throw new BadRequestException('fileName is required.');
    }

    const normalizedType = contentType?.toLowerCase().trim();
    if (!normalizedType || !isAllowedImageContentType(normalizedType)) {
      throw new BadRequestException(
        'contentType must be image/jpeg, image/png, image/webp, or image/gif',
      );
    }

    try {
      assertFileNameMatchesContentType(fileName.trim(), normalizedType);
    } catch {
      throw new BadRequestException(
        'fileName extension does not match contentType',
      );
    }

    const safeName = fileName.trim().replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `${ORIGINALS_PREFIX}${uuidv4()}-${safeName}`;

    const command = new PutObjectCommand({
      Bucket: this.originalsBucketName,
      Key: key,
      ContentType: normalizedType,
    });

    const uploadUrl = await getSignedUrl(
      this.awsService.s3Client,
      command,
      { expiresIn: PRESIGNED_PUT_EXPIRY_SECONDS },
    );

    return {
      uploadUrl,
      key,
      expiresIn: PRESIGNED_PUT_EXPIRY_SECONDS,
      originalsBucket: this.originalsBucketName,
      resizedBucket: this.resizedBucketName,
      resizedKeyPreview: toResizedKey(key),
    };
  }

  /** Copy originals/ key → resized/ thumbnail (300px wide). Used when Lambda is not wired. */
  async processUploadedImage(imageKey: string): Promise<{
    imageKey: string;
    resizedKey: string;
    resizedBucket: string;
  }> {
    if (!isValidImageKey(imageKey)) {
      throw new BadRequestException('imageKey must start with originals/');
    }

    const resizedKey = toResizedKey(imageKey);

    const sourceObject = await this.awsService.s3Client.send(
      new GetObjectCommand({
        Bucket: this.originalsBucketName,
        Key: imageKey,
      }),
    );

    const bodyBuffer = await this.streamBodyToBuffer(sourceObject.Body);
    const resizedBuffer = await sharp(bodyBuffer)
      .resize({ width: 300 })
      .toBuffer();

    await this.awsService.s3Client.send(
      new PutObjectCommand({
        Bucket: this.resizedBucketName,
        Key: resizedKey,
        Body: resizedBuffer,
        ContentType: sourceObject.ContentType || 'image/jpeg',
      }),
    );

    return {
      imageKey,
      resizedKey,
      resizedBucket: this.resizedBucketName,
    };
  }

  private async resizedObjectExists(resizedKey: string): Promise<boolean> {
    try {
      await this.awsService.s3Client.send(
        new HeadObjectCommand({
          Bucket: this.resizedBucketName,
          Key: resizedKey,
        }),
      );
      return true;
    } catch {
      return false;
    }
  }

  private async streamBodyToBuffer(body: unknown): Promise<Buffer> {
    if (!body) {
      throw new BadRequestException('Original image is empty in S3');
    }
    if (Buffer.isBuffer(body)) {
      return body;
    }
    if (body instanceof Uint8Array) {
      return Buffer.from(body);
    }

    const chunks: Buffer[] = [];
    for await (const chunk of body as AsyncIterable<Uint8Array | Buffer>) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  async createTaskForUser(dto: CreateTaskDto, user: CurrentUser) {
    if (!this.isManagerOrAdmin(user)) {
      throw new ForbiddenException('Only managers and admins can create tasks.');
    }

    if (dto.imageKey && !isValidImageKey(dto.imageKey)) {
      throw new BadRequestException('imageKey must start with originals/');
    }

    const now = new Date().toISOString();
    const taskId = uuidv4();

    const task: Record<string, any> = {
      taskId,
      title: dto.title,
      description: dto.description,
      status: 'To Do',
      priority: dto.priority,
      deadline: dto.deadline,
      assigneeId: dto.assigneeId,
      teamId: dto.teamId,
      createdBy: user.userId,
      createdAt: now,
      updatedAt: now,
    };

    if (dto.assigneeName) {
      task.assigneeName = dto.assigneeName;
    }

    if (dto.imageKey) {
      task.imageKey = dto.imageKey;
      task.imageHistory = [];
      await this.processUploadedImage(dto.imageKey);
    }

    await this.awsService.dynamoDbDocClient.send(
      new PutCommand({
        TableName: this.tasksTableName,
        Item: task,
      }),
    );

    const actorName = user.fullName || user.userId;
    await this.auditLogsService.logActivity({
      taskId,
      taskTitle: task.title,
      teamId: task.teamId,
      actorUserId: user.userId,
      actorName,
      actionType: 'CREATED',
      message: `${actorName} created task "${task.title}"`,
    });

    await this.cloudWatchTaskMetrics.recordTaskCreated(task.teamId);

    //ADD THESE LINES RIGHT BELOW IT:
    if (dto.assigneeId) {
      await this.snsService.publishTaskAssigned({
        taskId: task.taskId,
        title: task.title,
        assigneeId: dto.assigneeId,
        teamId: dto.teamId,
        priority: dto.priority,
        deadline: dto.deadline,
        assignedBy: user.fullName || user.userId,
      });
    }

    return this.enrichTaskWithImageUrls(task);
  }

  async getTaskHistoryForUser(taskId: string, user: CurrentUser) {
    const task = await this.getTaskRecord(taskId);
    if (!this.isManagerOrAdmin(user) && task.teamId !== user.teamId) {
      throw new ForbiddenException('You cannot view this task history.');
    }
    return this.auditLogsService.findByTaskId(
      taskId,
      user,
      task.teamId as string,
    );
  }

  async updateTaskForUser(
    taskId: string,
    dto: UpdateTaskDto,
    user: CurrentUser,
  ) {
    if (!this.isManager(user)) {
      throw new ForbiddenException('Only managers can update tasks.');
    }

    const existing = await this.getTaskRecord(taskId);
    await this.findOneForUser(taskId, user);

    const now = new Date().toISOString();
    const updates: Record<string, any> = { ...dto, updatedAt: now };
    delete updates.clearImage;

    if (dto.clearImage === true) {
      updates.imageKey = null;
    }

    if (dto.imageKey) {
      if (!isValidImageKey(dto.imageKey)) {
        throw new BadRequestException('imageKey must start with originals/');
      }

      const previousKey = existing.imageKey as string | undefined;
      if (previousKey && previousKey !== dto.imageKey) {
        const history = Array.isArray(existing.imageHistory)
          ? [...existing.imageHistory]
          : [];
        if (!history.includes(previousKey)) {
          history.push(previousKey);
        }
        updates.imageHistory = history;
      }
      updates.imageKey = dto.imageKey;
      await this.processUploadedImage(dto.imageKey);
    }

    const allowedFields = [
      'title',
      'description',
      'priority',
      'deadline',
      'assigneeId',
      'assigneeName',
      'teamId',
      'status',
      'imageKey',
      'imageHistory',
      'updatedAt',
    ];

    const setParts: string[] = [];
    const names: Record<string, string> = {};
    const values: Record<string, any> = {};

    for (const field of allowedFields) {
      if (updates[field] === undefined) continue;
      const nameKey = `#${field}`;
      const valueKey = `:${field}`;
      names[nameKey] = field;
      values[valueKey] = updates[field];
      setParts.push(`${nameKey} = ${valueKey}`);
    }

    if (dto.clearImage === true) {
      setParts.push('imageKey = :emptyImage');
      values[':emptyImage'] = null;
    }

    if (setParts.length === 0) {
      return this.enrichTaskWithImageUrls(existing);
    }

    if (updates.status === 'Done' && existing.status !== 'Done') {
      setParts.push('closedAt = :closedAt');
      values[':closedAt'] = now;
    }

    const result = await this.awsService.dynamoDbDocClient.send(
      new UpdateCommand({
        TableName: this.tasksTableName,
        Key: { taskId },
        UpdateExpression: `SET ${setParts.join(', ')}`,
        ExpressionAttributeNames:
          Object.keys(names).length > 0 ? names : undefined,
        ExpressionAttributeValues: values,
        ReturnValues: 'ALL_NEW',
      }),
    );

    const updated = result.Attributes || existing;

    // ==========================================
    // CLOUDWATCH: Record task closed
    // ==========================================
    if (updates.status === 'Done' && existing.status !== 'Done') {
      await this.cloudWatchTaskMetrics.recordTaskClosed(
        updated.teamId ?? existing.teamId,
        existing.createdAt,
        now,
      );
    }

    // ==========================================
    // SNS: Notify if assignee changed (NEW CODE)
    // ==========================================
    if (dto.assigneeId && dto.assigneeId !== existing.assigneeId) {
      await this.snsService.publishTaskAssigned({
        taskId: taskId,
        title: dto.title || existing.title,
        assigneeId: dto.assigneeId,
        teamId: dto.teamId || existing.teamId,
        priority: dto.priority || existing.priority,
        deadline: dto.deadline || existing.deadline,
        assignedBy: user.fullName || user.userId,
      });
    }

    return this.enrichTaskWithImageUrls(updated);
  }

  // async updateTaskForUser(
  //   taskId: string,
  //   dto: UpdateTaskDto,
  //   user: CurrentUser,
  // ) {
  //   if (!this.isManager(user)) {
  //     throw new ForbiddenException('Only managers can update tasks.');
  //   }

  //   const existing = await this.getTaskRecord(taskId);
  //   await this.findOneForUser(taskId, user);

  //   const now = new Date().toISOString();
  //   const updates: Record<string, any> = { ...dto, updatedAt: now };
  //   delete updates.clearImage;

  //   if (dto.clearImage === true) {
  //     updates.imageKey = null;
  //   }

  //   if (dto.imageKey) {
  //     if (!isValidImageKey(dto.imageKey)) {
  //       throw new BadRequestException('imageKey must start with originals/');
  //     }

  //     const previousKey = existing.imageKey as string | undefined;
  //     if (previousKey && previousKey !== dto.imageKey) {
  //       const history = Array.isArray(existing.imageHistory)
  //         ? [...existing.imageHistory]
  //         : [];
  //       if (!history.includes(previousKey)) {
  //         history.push(previousKey);
  //       }
  //       updates.imageHistory = history;
  //     }
  //     updates.imageKey = dto.imageKey;
  //     await this.processUploadedImage(dto.imageKey);
  //   }

  //   const allowedFields = [
  //     'title',
  //     'description',
  //     'priority',
  //     'deadline',
  //     'assigneeId',
  //     'assigneeName',
  //     'teamId',
  //     'status',
  //     'imageKey',
  //     'imageHistory',
  //     'updatedAt',
  //   ];

  //   const setParts: string[] = [];
  //   const names: Record<string, string> = {};
  //   const values: Record<string, any> = {};

  //   for (const field of allowedFields) {
  //     if (updates[field] === undefined) continue;
  //     const nameKey = `#${field}`;
  //     const valueKey = `:${field}`;
  //     names[nameKey] = field;
  //     values[valueKey] = updates[field];
  //     setParts.push(`${nameKey} = ${valueKey}`);
  //   }

  //   if (dto.clearImage === true) {
  //     setParts.push('imageKey = :emptyImage');
  //     values[':emptyImage'] = null;
  //   }

  //   if (setParts.length === 0) {
  //     return this.enrichTaskWithImageUrls(existing);
  //   }

  //   if (updates.status === 'Done' && existing.status !== 'Done') {
  //     setParts.push('closedAt = :closedAt');
  //     values[':closedAt'] = now;
  //   }

  //   const result = await this.awsService.dynamoDbDocClient.send(
  //     new UpdateCommand({
  //       TableName: this.tasksTableName,
  //       Key: { taskId },
  //       UpdateExpression: `SET ${setParts.join(', ')}`,
  //       ExpressionAttributeNames:
  //         Object.keys(names).length > 0 ? names : undefined,
  //       ExpressionAttributeValues: values,
  //       ReturnValues: 'ALL_NEW',
  //     }),
  //   );

  //   const updated = result.Attributes || existing;
  //   if (updates.status === 'Done' && existing.status !== 'Done') {
  //     await this.cloudWatchTaskMetrics.recordTaskClosed(
  //       updated.teamId ?? existing.teamId,
  //       existing.createdAt,
  //       now,
  //     );
  //   }

  //   return this.enrichTaskWithImageUrls(updated);
  // }

  async deleteTaskForUser(taskId: string, user: CurrentUser) {
    if (!this.isManagerOrAdmin(user)) {
      throw new ForbiddenException('Only managers and admins can delete tasks.');
    }

    const task = await this.getTaskRecord(taskId);

    const keysToDelete = new Set<string>();
    if (task.imageKey) {
      keysToDelete.add(task.imageKey);
    }

    await this.deleteS3ImagePair(task.imageKey);

    const actorName = user.fullName || user.userId;
    await this.auditLogsService.logActivity({
      taskId: task.taskId,
      taskTitle: task.title,
      teamId: task.teamId,
      actorUserId: user.userId,
      actorName,
      actionType: 'DELETED',
      message: `${actorName} deleted task "${task.title}"`,
    });

    await this.awsService.dynamoDbDocClient.send(
      new DeleteCommand({
        TableName: this.tasksTableName,
        Key: { taskId },
      }),
    );

    return {
      message: 'Task deleted successfully.',
      taskId,
      deletedImageKeys: [...keysToDelete],
    };
  }

  private async deleteS3ImagePair(imageKey?: string) {
    if (!imageKey) return;

    const resizedKey = toResizedKey(imageKey);

    await this.awsService.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.originalsBucketName,
        Key: imageKey,
      }),
    );

    try {
      await this.awsService.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.resizedBucketName,
          Key: resizedKey,
        }),
      );
    } catch {
      // Thumbnail may not exist yet if Lambda has not run
    }
  }

  async updateStatusForUser(
    taskId: string,
    newStatus: string,
    user: CurrentUser,
  ) {
    const allowedStatuses = ['To Do', 'In Progress', 'In Review', 'Done'];

    if (!allowedStatuses.includes(newStatus)) {
      throw new BadRequestException('Invalid task status.');
    }

    const task = await this.getTaskRecord(taskId);

    if (!this.isManagerOrAdmin(user) && task.teamId !== user.teamId) {
      throw new ForbiddenException('You cannot update another team’s task.');
    }

    if (!this.isManagerOrAdmin(user) && task.assigneeId !== user.userId) {
      throw new ForbiddenException('You can update only tasks assigned to you.');
    }

    const oldStatus = task.status;
    const now = new Date().toISOString();

    const expressionAttributeValues: Record<string, any> = {
      ':newStatus': newStatus,
      ':updatedAt': now,
    };

    let updateExpression = 'SET #status = :newStatus, updatedAt = :updatedAt';

    if (newStatus === 'Done') {
      updateExpression += ', closedAt = :closedAt';
      expressionAttributeValues[':closedAt'] = now;
    }

    await this.awsService.dynamoDbDocClient.send(
      new UpdateCommand({
        TableName: this.tasksTableName,
        Key: { taskId },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: expressionAttributeValues,
      }),
    );

    const actorName = user.fullName || user.userId;

    await this.auditLogsService.logActivity({
      taskId: task.taskId,
      taskTitle: task.title,
      teamId: task.teamId,
      actorUserId: user.userId,
      actorName,
      actionType: 'STATUS_CHANGED',
      fromStatus: oldStatus,
      toStatus: newStatus,
      message: `${actorName} moved "${task.title}" from ${oldStatus} to ${newStatus}`,
    });

    if (newStatus === 'Done' && oldStatus !== 'Done') {
      await this.cloudWatchTaskMetrics.recordTaskClosed(
        task.teamId,
        task.createdAt,
        now,
      );
    }

    const updated = await this.getTaskRecord(taskId);
    return {
      message: 'Task status updated successfully.',
      task: await this.enrichTaskWithImageUrls(updated),
      taskId,
      fromStatus: oldStatus,
      toStatus: newStatus,
      updatedAt: now,
    };
  }
}
