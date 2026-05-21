import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    GetCommand,
    PutCommand,
    QueryCommand,
    ScanCommand,
    UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { AwsService } from '../AWS/aws.service';
import { v4 as uuidv4 } from 'uuid';

type CurrentUser = {
    userId: string;
    role: string;
    teamId?: string | null;
};

type NormalizedCurrentUser = CurrentUser & {
    role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
};

const ALLOWED_STATUSES = ['To Do', 'In Progress', 'In Review', 'Done'];

@Injectable()
export class TasksService {
    private readonly tasksTableName: string;
    private readonly activityLogTableName: string;

    constructor(
        private readonly awsService: AwsService,
        private readonly configService: ConfigService,
    ) {
        this.tasksTableName =
            this.configService.get<string>('TABLE_TASKS') || 'mini-jira-Tasks';
        this.activityLogTableName =
            this.configService.get<string>('TABLE_ACTIVITY_LOG') ||
            'mini-jira-ActivityLog';
    }

    private normalizeUser(user: CurrentUser | null | undefined): NormalizedCurrentUser {
        if (!user?.userId) {
            throw new UnauthorizedException('Authenticated user is required.');
        }

        const role = String(user.role || '').trim().toUpperCase();

        if (role !== 'ADMIN' && role !== 'MANAGER' && role !== 'EMPLOYEE') {
            throw new ForbiddenException('Access denied: unsupported user role.');
        }

        return {
            ...user,
            role,
        };
    }

    private isManagerOrAdmin(user: NormalizedCurrentUser): boolean {
        return user.role === 'MANAGER' || user.role === 'ADMIN';
    }

    private getAssignedUserId(task: Record<string, any>): string | undefined {
        return task.assigneeId ?? task.assignedUserId ?? task.assignedToUserId ?? task.assignedTo;
    }

    async findAllForUser(user: CurrentUser, requestedTeamId?: string) {
        const currentUser = this.normalizeUser(user);

        if (this.isManagerOrAdmin(currentUser)) {
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

        if (!currentUser.teamId) {
            throw new ForbiddenException('Employee does not have a teamId.');
        }

        if (requestedTeamId && requestedTeamId !== currentUser.teamId) {
            throw new ForbiddenException("You cannot view another team's tasks.");
        }

        return this.findByTeamId(currentUser.teamId);
    }

    async findOneForUser(taskId: string, user: CurrentUser) {
        const currentUser = this.normalizeUser(user);

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

        if (this.isManagerOrAdmin(currentUser)) {
            return task;
        }

        if (task.teamId !== currentUser.teamId) {
            throw new ForbiddenException("You cannot view another team's task.");
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

    async updateStatusForUser(taskId: string, newStatus: string, user: CurrentUser) {
        const currentUser = this.normalizeUser(user);

        if (!ALLOWED_STATUSES.includes(newStatus)) {
            throw new BadRequestException(
                `Invalid task status. Must be one of: ${ALLOWED_STATUSES.join(', ')}.`,
            );
        }

        const task = await this.findOneForUser(taskId, currentUser);

        if (!this.isManagerOrAdmin(currentUser) && this.getAssignedUserId(task) !== currentUser.userId) {
            throw new ForbiddenException('You can update only tasks assigned to you.');
        }

        const oldStatus = task.status;
        const now = new Date().toISOString();
        const closedAt = newStatus === 'Done' ? now : null;

        await this.awsService.dynamoDbDocClient.send(
            new UpdateCommand({
                TableName: this.tasksTableName,
                Key: {
                    taskId,
                },
                UpdateExpression: 'SET #status = :newStatus, updatedAt = :updatedAt, closedAt = :closedAt',
                ExpressionAttributeNames: {
                    '#status': 'status',
                },
                ExpressionAttributeValues: {
                    ':newStatus': newStatus,
                    ':updatedAt': now,
                    ':closedAt': closedAt,
                },
            }),
        );

        await this.awsService.dynamoDbDocClient.send(
            new PutCommand({
                TableName: this.activityLogTableName,
                Item: {
                    logId: uuidv4(),
                    taskId: task.taskId,
                    teamId: task.teamId,
                    actorUserId: currentUser.userId,
                    actorName: currentUser.userId,
                    actionType: 'STATUS_CHANGED',
                    fromStatus: oldStatus,
                    toStatus: newStatus,
                    message: `${currentUser.userId} moved ${task.title} from ${oldStatus} to ${newStatus}`,
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
            closedAt,
        };
    }
}
