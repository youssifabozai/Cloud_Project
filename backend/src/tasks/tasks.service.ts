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
import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AwsService } from '../AWS/aws.service';
import { v4 as uuidv4 } from 'uuid';


type CurrentUser = {
    userId: string;
    role: string;
    teamId: string;
};

@Injectable()
export class TasksService {
    private readonly tasksTableName: string;
    private readonly activityLogTableName: string;
    private readonly originalsBucketName: string;
    private readonly resizedBucketName: string;

    constructor(
        private readonly awsService: AwsService,
        private readonly configService: ConfigService,
    ) {
        this.tasksTableName =
            this.configService.get<string>('TABLE_TASKS') || 'mini-jira-Tasks';
        this.activityLogTableName =
            this.configService.get<string>('TABLE_ACTIVITY_LOG') ||
            'mini-jira-ActivityLog';
        this.originalsBucketName =
            this.configService.get<string>('ORIGINAL_IMAGES_BUCKET') || 'original-images';
        this.resizedBucketName =
            this.configService.get<string>('RESIZED_IMAGES_BUCKET') || 'resized-images';
    }

    private isManagerOrAdmin(user: CurrentUser): boolean {
        const r = user.role?.toUpperCase();
        return r === 'MANAGER' || r === 'ADMIN';
    }

    private isManager(user: CurrentUser): boolean {
        return user.role?.toUpperCase() === 'MANAGER';
    }

    async findAllForUser(user: CurrentUser, requestedTeamId?: string) {
        // Manager or Admin can see all tasks.
        // If they choose a team filter, we query by teamId-index.
        if (this.isManagerOrAdmin(user)) {
            if (requestedTeamId) {
                return this.findByTeamId(requestedTeamId);
            }

            const result = await this.awsService.dynamoDbDocClient.send(
                new ScanCommand({
                    TableName: this.tasksTableName,
                }),
            );

            return result.Items || [];
        }

        // Employee must have a teamId.
        if (!user.teamId) {
            throw new ForbiddenException('Employee does not have a teamId.');
        }

        // Employee cannot request another team's tasks.
        if (requestedTeamId && requestedTeamId !== user.teamId) {
            throw new ForbiddenException('You cannot view another team’s tasks.');
        }

        // Employee only gets tasks from their own team.
        return this.findByTeamId(user.teamId);
    }

    async findOneForUser(taskId: string, user: CurrentUser) {
        const result = await this.awsService.dynamoDbDocClient.send(
            new GetCommand({
                TableName: this.tasksTableName,
                Key: {
                    taskId,
                },
            }),
        );

        const task = result.Item;

        if (!task) {
            throw new NotFoundException('Task not found.');
        }

        // Manager or Admin can open any task.
        if (this.isManagerOrAdmin(user)) {
            return task;
        }

        // Employee cannot open a task from another team, even if they guess the ID.
        if (task.teamId !== user.teamId) {
            throw new ForbiddenException('You cannot view another team’s task.');
        }

        return task;
    }

    private async findByTeamId(teamId: string) {
        const result = await this.awsService.dynamoDbDocClient.send(
            new QueryCommand({
                TableName: this.tasksTableName,
                IndexName: 'teamId-index',
                KeyConditionExpression: 'teamId = :teamId',
                ExpressionAttributeValues: {
                    ':teamId': teamId,
                },
            }),
        );

        return result.Items || [];
    }
    async generateUploadUrl(fileName: string, contentType: string) {
        if (!fileName) {
            throw new BadRequestException('fileName is required.');
        }

        if (!contentType) {
            throw new BadRequestException('contentType is required.');
        }

        const key = `originals/${uuidv4()}-${fileName}`;
        const command = new PutObjectCommand({
            Bucket: this.originalsBucketName,
            Key: key,
            ContentType: contentType,
        });

        const uploadUrl = await getSignedUrl(this.awsService.s3Client, command, {
            expiresIn: 900,
        });

        return {
            uploadUrl,
            key,
        };
    }

    async createTaskForUser(payload: Record<string, any>, user: CurrentUser) {
        if (!this.isManager(user)) {
            throw new ForbiddenException('Only managers can create tasks.');
        }

        const now = new Date().toISOString();
        const taskId = uuidv4();

        const task = {
            taskId,
            ...payload,
            createdAt: now,
            updatedAt: now,
        };

        await this.awsService.dynamoDbDocClient.send(
            new PutCommand({
                TableName: this.tasksTableName,
                Item: task,
            }),
        );

        return task;
    }

    async updateTaskForUser(taskId: string, payload: Record<string, any>, user: CurrentUser) {
        if (!this.isManager(user)) {
            throw new ForbiddenException('Only managers can update tasks.');
        }

        await this.findOneForUser(taskId, user);

        const now = new Date().toISOString();
        const updateExpressionParts: string[] = [];
        const expressionAttributeValues: Record<string, any> = {
            ':updatedAt': now,
        };

        for (const [key, value] of Object.entries(payload)) {
            updateExpressionParts.push(`${key} = :${key}`);
            expressionAttributeValues[`:${key}`] = value;
        }

        if (updateExpressionParts.length === 0) {
            return this.findOneForUser(taskId, user);
        }

        const result = await this.awsService.dynamoDbDocClient.send(
            new UpdateCommand({
                TableName: this.tasksTableName,
                Key: { taskId },
                UpdateExpression: `SET ${updateExpressionParts.join(', ')}, updatedAt = :updatedAt`,
                ExpressionAttributeValues: expressionAttributeValues,
                ReturnValues: 'ALL_NEW',
            }),
        );

        return result.Attributes;
    }

    async deleteTaskForUser(taskId: string, user: CurrentUser) {
        if (!this.isManager(user)) {
            throw new ForbiddenException('Only managers can delete tasks.');
        }

        const task = await this.findOneForUser(taskId, user);

        if (task?.imageKey) {
            const resizedKey = task.imageKey.startsWith('originals/')
                ? task.imageKey.replace(/^originals\//, 'resized/')
                : `resized/${task.imageKey}`;

            await this.awsService.s3Client.send(
                new DeleteObjectCommand({
                    Bucket: this.originalsBucketName,
                    Key: task.imageKey,
                }),
            );

            await this.awsService.s3Client.send(
                new DeleteObjectCommand({
                    Bucket: this.resizedBucketName,
                    Key: resizedKey,
                }),
            );
        }

        await this.awsService.dynamoDbDocClient.send(
            new DeleteCommand({
                TableName: this.tasksTableName,
                Key: { taskId },
            }),
        );

        return {
            message: 'Task deleted successfully.',
            taskId,
        };
    }

    async updateStatusForUser(taskId: string, newStatus: string, user: CurrentUser) {
        const allowedStatuses = ['To Do', 'In Progress', 'In Review', 'Done'];

        if (!allowedStatuses.includes(newStatus)) {
            throw new ForbiddenException('Invalid task status.');
        }

        const task = await this.findOneForUser(taskId, user);

        // Employees can update status only for tasks assigned to them.
        // Managers and Admins can update any task.
        if (!this.isManagerOrAdmin(user) && task.assigneeId !== user.userId) {
            throw new ForbiddenException('You can update only tasks assigned to you.');
        }

        const oldStatus = task.status;

        const now = new Date().toISOString();

        const updateExpressionParts = ['#status = :newStatus', 'updatedAt = :updatedAt'];

        const expressionAttributeNames = {
            '#status': 'status',
        };

        const expressionAttributeValues: any = {
            ':newStatus': newStatus,
            ':updatedAt': now,
        };

        if (newStatus === 'Done') {
            updateExpressionParts.push('closedAt = :closedAt');
            expressionAttributeValues[':closedAt'] = now;
        }

        await this.awsService.dynamoDbDocClient.send(
            new UpdateCommand({
                TableName: this.tasksTableName,
                Key: {
                    taskId,
                },
                UpdateExpression: `SET ${updateExpressionParts.join(', ')}`,
                ExpressionAttributeNames: expressionAttributeNames,
                ExpressionAttributeValues: expressionAttributeValues,
            }),
        );

        await this.awsService.dynamoDbDocClient.send(
            new PutCommand({
                TableName: this.activityLogTableName,
                Item: {
                    logId: uuidv4(),
                    taskId: task.taskId,
                    teamId: task.teamId,
                    actorUserId: user.userId,
                    actorName: user.userId,
                    actionType: 'STATUS_CHANGED',
                    fromStatus: oldStatus,
                    toStatus: newStatus,
                    message: `${user.userId} moved ${task.title} from ${oldStatus} to ${newStatus}`,
                    createdAt: now,
                },
            }),
        );

        return {
            message: 'Task status updated successfully.',
            taskId,
            fromStatus: oldStatus,
            toStatus: newStatus,
            updatedAt: now,
        };
    }

}