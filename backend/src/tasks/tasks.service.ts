import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    Logger,
    NotFoundException,
    UnauthorizedException,
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
import { AwsService } from '../AWS/aws.service';
import { NotificationsService } from '../notifications/notifications.service';
import { v4 as uuidv4 } from 'uuid';

type CurrentUser = {
    userId: string;
    role: string;
    teamId?: string | null;
};

type NormalizedCurrentUser = CurrentUser & {
    role: 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
};

type TaskPayload = Record<string, any>;

const ALLOWED_STATUSES = ['To Do', 'In Progress', 'In Review', 'Done'];
const ALLOWED_PRIORITIES = ['Low', 'Medium', 'High'];
const REQUIRED_CREATE_FIELDS = ['title', 'description', 'priority', 'deadline', 'assigneeId', 'teamId'];
const ALLOWED_CREATE_FIELDS = ['title', 'description', 'priority', 'deadline', 'assigneeId', 'teamId', 'projectId'];
const ALLOWED_UPDATE_FIELDS = ['title', 'description', 'priority', 'deadline', 'teamId', 'assigneeId', 'projectId', 'status'];
const STATUS_SEQUENCE = ['To Do', 'In Progress', 'In Review', 'Done'];

@Injectable()
export class TasksService {
    private readonly logger = new Logger(TasksService.name);
    private readonly tasksTableName: string;
    private readonly activityLogTableName: string;
    private readonly usersTableName: string;
    private readonly teamsTableName: string;

    constructor(
        private readonly awsService: AwsService,
        private readonly configService: ConfigService,
        private readonly notificationsService: NotificationsService,
    ) {
        this.tasksTableName =
            this.configService.get<string>('TABLE_TASKS') || 'mini-jira-Tasks';
        this.activityLogTableName =
            this.configService.get<string>('TABLE_ACTIVITY_LOG') ||
            'mini-jira-ActivityLog';
        this.usersTableName = this.configService.get<string>('TABLE_USERS') || '';
        this.teamsTableName = this.configService.get<string>('TABLE_TEAMS') || '';
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

    private assertManagerOrAdmin(user: NormalizedCurrentUser) {
        if (!this.isManagerOrAdmin(user)) {
            throw new ForbiddenException('Only manager or admin users can perform this action.');
        }
    }

    private getAssignedUserId(task: Record<string, any>): string | undefined {
        return task.assigneeId ?? task.assignedUserId ?? task.assignedToUserId ?? task.assignedTo;
    }

    private validateStatus(status: string) {
        if (!ALLOWED_STATUSES.includes(status)) {
            throw new BadRequestException(
                `Invalid task status. Must be one of: ${ALLOWED_STATUSES.join(', ')}.`,
            );
        }
    }

    private validateStatusTransition(currentStatus: string, newStatus: string) {
        this.validateStatus(currentStatus);
        this.validateStatus(newStatus);

        if (currentStatus === newStatus) {
            throw new BadRequestException(`Task is already in status ${newStatus}.`);
        }

        const currentIndex = STATUS_SEQUENCE.indexOf(currentStatus);
        const nextIndex = STATUS_SEQUENCE.indexOf(newStatus);

        if (nextIndex !== currentIndex + 1) {
            throw new BadRequestException(
                `Invalid status transition from ${currentStatus} to ${newStatus}. Allowed flow is: ${STATUS_SEQUENCE.join(' -> ')}.`,
            );
        }
    }

    private validatePriority(priority: string) {
        if (!ALLOWED_PRIORITIES.includes(priority)) {
            throw new BadRequestException(
                `Invalid task priority. Must be one of: ${ALLOWED_PRIORITIES.join(', ')}.`,
            );
        }
    }

    private validateDeadline(deadline: string) {
        if (!deadline || Number.isNaN(Date.parse(deadline))) {
            throw new BadRequestException('deadline must be a valid date string.');
        }
    }

    private validateRequiredFields(body: TaskPayload) {
        const missingFields = REQUIRED_CREATE_FIELDS.filter((field) => body[field] === undefined || body[field] === null || body[field] === '');

        if (missingFields.length > 0) {
            throw new BadRequestException(`Missing required task fields: ${missingFields.join(', ')}.`);
        }
    }

    private async getTaskOrThrow(taskId: string) {
        const result = await this.awsService.dynamoDbDocClient.send(
            new GetCommand({
                TableName: this.tasksTableName,
                Key: {
                    taskId,
                },
            }),
        );

        if (!result.Item) {
            throw new NotFoundException('Task not found.');
        }

        return result.Item;
    }

    private async getUserForValidation(userId: string) {
        if (!this.usersTableName) {
            throw new BadRequestException('User validation is not configured.');
        }

        const result = await this.awsService.dynamoDbDocClient.send(
            new GetCommand({
                TableName: this.usersTableName,
                Key: {
                    userId,
                },
            }),
        );

        if (!result.Item) {
            throw new BadRequestException(`Assignee ${userId} was not found.`);
        }

        return result.Item;
    }

    private async getTeamForValidation(teamId: string) {
        if (!this.teamsTableName) {
            throw new BadRequestException('Team validation is not configured.');
        }

        const result = await this.awsService.dynamoDbDocClient.send(
            new GetCommand({
                TableName: this.teamsTableName,
                Key: {
                    teamId,
                },
            }),
        );

        if (!result.Item) {
            throw new BadRequestException(`Team ${teamId} was not found.`);
        }

        return result.Item;
    }

    private async validateAssigneeBelongsToTeam(assigneeId: string, teamId: string) {
        if (!assigneeId) {
            throw new BadRequestException('assigneeId is required.');
        }

        if (!teamId) {
            throw new BadRequestException('teamId is required.');
        }

        await this.getTeamForValidation(teamId);
        const assignee = await this.getUserForValidation(assigneeId);

        if (assignee.teamId !== teamId) {
            throw new BadRequestException(`Assignee ${assigneeId} does not belong to team ${teamId}.`);
        }
    }

    private async writeActivityLog(item: Record<string, any>) {
        await this.awsService.dynamoDbDocClient.send(
            new PutCommand({
                TableName: this.activityLogTableName,
                Item: {
                    logId: uuidv4(),
                    createdAt: new Date().toISOString(),
                    ...item,
                },
            }),
        );
    }

    private sortLogsByCreatedAt(logs: Record<string, any>[]) {
        return logs.sort((a, b) => String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? '')));
    }

    private async queryActivityLogsByTaskId(taskId: string) {
        try {
            const result = await this.awsService.dynamoDbDocClient.send(
                new QueryCommand({
                    TableName: this.activityLogTableName,
                    IndexName: 'taskId-index',
                    KeyConditionExpression: 'taskId = :taskId',
                    ExpressionAttributeValues: {
                        ':taskId': taskId,
                    },
                }),
            );

            return this.sortLogsByCreatedAt(result.Items ?? []);
        } catch (error: any) {
            if (error.name !== 'ValidationException') {
                throw error;
            }

            this.logger.warn('taskId-index is missing on ActivityLog; falling back to Scan for task history.');
            const result = await this.awsService.dynamoDbDocClient.send(
                new ScanCommand({
                    TableName: this.activityLogTableName,
                    FilterExpression: 'taskId = :taskId',
                    ExpressionAttributeValues: {
                        ':taskId': taskId,
                    },
                }),
            );

            return this.sortLogsByCreatedAt(result.Items ?? []);
        }
    }

    private async publishTaskAssignment(task: Record<string, any>, assigneeId: string) {
        try {
            await this.notificationsService.dispatchSnsNotification(
                `You have been assigned task: ${task.title ?? task.taskId}`,
                assigneeId,
            );
        } catch (error: any) {
            this.logger.warn(`Failed to publish assignment notification for task ${task.taskId}: ${error?.message}`);
        }
    }

    async createForUser(body: TaskPayload, user: CurrentUser) {
        const currentUser = this.normalizeUser(user);
        this.assertManagerOrAdmin(currentUser);
        this.validateRequiredFields(body);
        this.validatePriority(body.priority);
        this.validateDeadline(body.deadline);

        const status = body.status ?? 'To Do';
        this.validateStatus(status);
        await this.validateAssigneeBelongsToTeam(body.assigneeId, body.teamId);

        const now = new Date().toISOString();
        const taskId = uuidv4();
        const task = ALLOWED_CREATE_FIELDS.reduce((item, field) => {
            if (body[field] !== undefined) {
                item[field] = body[field];
            }

            return item;
        }, {} as Record<string, any>);

        Object.assign(task, {
            taskId,
            status,
            createdBy: currentUser.userId,
            closedAt: status === 'Done' ? now : null,
            createdAt: now,
            updatedAt: now,
        });

        await this.awsService.dynamoDbDocClient.send(
            new PutCommand({
                TableName: this.tasksTableName,
                Item: task,
            }),
        );

        await this.writeActivityLog({
            taskId: task.taskId,
            teamId: task.teamId,
            actorUserId: currentUser.userId,
            actorName: currentUser.userId,
            actionType: 'TASK_CREATED',
            message: `${currentUser.userId} created task ${task.title}`,
        });

        await this.writeActivityLog({
            taskId: task.taskId,
            teamId: task.teamId,
            actorUserId: currentUser.userId,
            actorName: currentUser.userId,
            assigneeId: task.assigneeId,
            actionType: 'TASK_ASSIGNED',
            message: `${currentUser.userId} assigned task ${task.title} to ${task.assigneeId}`,
        });
        await this.publishTaskAssignment(task, task.assigneeId);

        return task;
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
        const task = await this.getTaskOrThrow(taskId);

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
        this.validateStatus(newStatus);

        const task = await this.findOneForUser(taskId, currentUser);

        if (!this.isManagerOrAdmin(currentUser) && this.getAssignedUserId(task) !== currentUser.userId) {
            throw new ForbiddenException('You can update only tasks assigned to you.');
        }

        const oldStatus = task.status;
        this.validateStatusTransition(oldStatus, newStatus);

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

        await this.writeActivityLog({
            taskId: task.taskId,
            teamId: task.teamId,
            actorUserId: currentUser.userId,
            actorName: currentUser.userId,
            actionType: 'STATUS_CHANGED',
            fromStatus: oldStatus,
            toStatus: newStatus,
            message: `${currentUser.userId} moved ${task.title} from ${oldStatus} to ${newStatus}`,
        });

        return {
            message: 'Task status updated successfully.',
            taskId,
            fromStatus: oldStatus,
            toStatus: newStatus,
            updatedAt: now,
            closedAt,
        };
    }

    async findHistoryForUser(taskId: string, user: CurrentUser) {
        await this.findOneForUser(taskId, user);
        return this.queryActivityLogsByTaskId(taskId);
    }

    async updateForUser(taskId: string, body: TaskPayload, user: CurrentUser) {
        const currentUser = this.normalizeUser(user);
        this.assertManagerOrAdmin(currentUser);

        const task = await this.getTaskOrThrow(taskId);
        const updates: Record<string, any> = {};

        for (const field of ALLOWED_UPDATE_FIELDS) {
            if (body[field] !== undefined) {
                updates[field] = body[field];
            }
        }

        if (Object.keys(updates).length === 0) {
            throw new BadRequestException(`At least one allowed field is required: ${ALLOWED_UPDATE_FIELDS.join(', ')}.`);
        }

        if (updates.priority !== undefined) {
            this.validatePriority(updates.priority);
        }

        if (updates.status !== undefined) {
            this.validateStatus(updates.status);
            this.validateStatusTransition(task.status, updates.status);
            updates.closedAt = updates.status === 'Done' ? new Date().toISOString() : null;
        }

        if (updates.deadline !== undefined) {
            this.validateDeadline(updates.deadline);
        }

        if (updates.assigneeId !== undefined || updates.teamId !== undefined) {
            const targetAssigneeId = updates.assigneeId ?? this.getAssignedUserId(task);
            const targetTeamId = updates.teamId ?? task.teamId;
            await this.validateAssigneeBelongsToTeam(targetAssigneeId, targetTeamId);
        }

        updates.updatedAt = new Date().toISOString();

        const expressionAttributeNames: Record<string, string> = {};
        const expressionAttributeValues: Record<string, any> = {};
        const setExpressions: string[] = [];

        Object.entries(updates).forEach(([field, value]) => {
            expressionAttributeNames[`#${field}`] = field;
            expressionAttributeValues[`:${field}`] = value;
            setExpressions.push(`#${field} = :${field}`);
        });

        const result = await this.awsService.dynamoDbDocClient.send(
            new UpdateCommand({
                TableName: this.tasksTableName,
                Key: {
                    taskId,
                },
                UpdateExpression: `SET ${setExpressions.join(', ')}`,
                ExpressionAttributeNames: expressionAttributeNames,
                ExpressionAttributeValues: expressionAttributeValues,
                ReturnValues: 'ALL_NEW',
            }),
        );

        const updatedTask = result.Attributes ?? { ...task, ...updates };
        const assigneeChanged = updates.assigneeId !== undefined && updates.assigneeId !== task.assigneeId;

        await this.writeActivityLog({
            taskId,
            teamId: updatedTask.teamId ?? task.teamId,
            actorUserId: currentUser.userId,
            actorName: currentUser.userId,
            actionType: 'TASK_UPDATED',
            message: `${currentUser.userId} updated task ${updatedTask.title ?? task.title}`,
        });

        if (assigneeChanged) {
            await this.writeActivityLog({
                taskId,
                teamId: updatedTask.teamId ?? task.teamId,
                actorUserId: currentUser.userId,
                actorName: currentUser.userId,
                assigneeId: updates.assigneeId,
                actionType: 'TASK_ASSIGNED',
                message: `${currentUser.userId} assigned task ${updatedTask.title ?? task.title} to ${updates.assigneeId}`,
            });
            await this.publishTaskAssignment(updatedTask, updates.assigneeId);
        }

        return updatedTask;
    }

    async assignForUser(taskId: string, assigneeId: string, user: CurrentUser) {
        if (!assigneeId) {
            throw new BadRequestException('assigneeId is required.');
        }

        return this.updateForUser(taskId, { assigneeId }, user);
    }

    async deleteForUser(taskId: string, user: CurrentUser) {
        const currentUser = this.normalizeUser(user);
        this.assertManagerOrAdmin(currentUser);

        const task = await this.getTaskOrThrow(taskId);

        await this.awsService.dynamoDbDocClient.send(
            new DeleteCommand({
                TableName: this.tasksTableName,
                Key: {
                    taskId,
                },
            }),
        );

        // Image/S3 cleanup is handled by the image module owner.
        await this.writeActivityLog({
            taskId,
            teamId: task.teamId,
            actorUserId: currentUser.userId,
            actorName: currentUser.userId,
            actionType: 'TASK_DELETED',
            message: `${currentUser.userId} deleted task ${task.title}`,
        });

        return {
            message: 'Task deleted successfully.',
            taskId,
        };
    }
}
