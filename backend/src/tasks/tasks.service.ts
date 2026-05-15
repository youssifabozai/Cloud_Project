import {
    ForbiddenException,
    Injectable,
    NotFoundException,
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


type CurrentUser = {
    userId: string;
    role: string;
    teamId: string;
};

@Injectable()
export class TasksService {
    private readonly tasksTableName: string;
    private readonly activityLogTableName: string;

    constructor(
        private readonly awsService: AwsService,
        private readonly configService: ConfigService,
    ) {
        this.tasksTableName =
            this.configService.get<string>('TASKS_TABLE_NAME') || 'mini-jira-Tasks';
        this.activityLogTableName =
            this.configService.get<string>('ACTIVITY_LOG_TABLE_NAME') ||
            'mini-jira-ActivityLog';
    }

    private isManager(user: CurrentUser): boolean {
        return user.role?.toLowerCase() === 'manager';
    }

    async findAllForUser(user: CurrentUser, requestedTeamId?: string) {
        // Manager can see all tasks.
        // If manager chooses a team filter, we query by teamId-index.
        if (this.isManager(user)) {
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

        // Manager can open any task.
        if (this.isManager(user)) {
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

    async updateStatusForUser(taskId: string, newStatus: string, user: CurrentUser) {
        const allowedStatuses = ['To Do', 'In Progress', 'In Review', 'Done'];

        if (!allowedStatuses.includes(newStatus)) {
            throw new ForbiddenException('Invalid task status.');
        }

        const task = await this.findOneForUser(taskId, user);

        // Employees can update status only for tasks assigned to them.
        // Manager can update any task.
        if (!this.isManager(user) && task.assigneeId !== user.userId) {
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
                    logId: `log_${Date.now()}`,
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