import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

@Injectable()
export class SnsService {
    private readonly snsClient: SNSClient;
    private readonly assignmentTopicArn: string;
    private readonly logger = new Logger(SnsService.name);

    constructor(private readonly configService: ConfigService) {
        this.snsClient = new SNSClient({
            region: this.configService.get<string>('AWS_REGION')?.trim() || 'us-east-1',
        });
        this.assignmentTopicArn = this.configService.get<string>('SNS_ASSIGNMENT_TOPIC')?.trim() || '';
    }

    async publishTaskAssigned(task: {
        taskId: string;
        title: string;
        assigneeId: string;
        teamId: string;
        priority?: string;
        deadline?: string;
        assignedBy?: string;
    }): Promise<void> {
        if (!this.assignmentTopicArn) {
            this.logger.warn('SNS_ASSIGNMENT_TOPIC not configured. Skipping SNS publish.');
            return;
        }

        const message = {
            event: 'TASK_ASSIGNED',
            taskId: task.taskId,
            title: task.title,
            assigneeId: task.assigneeId,
            teamId: task.teamId,
            priority: task.priority || 'MEDIUM',
            deadline: task.deadline || '',
            assignedBy: task.assignedBy || 'System',
            timestamp: new Date().toISOString(),
        };

        try {
            await this.snsClient.send(
                new PublishCommand({
                    TopicArn: this.assignmentTopicArn,
                    Message: JSON.stringify(message),
                    Subject: `New Task Assigned: ${task.title}`,
                }),
            );
            this.logger.log(`SNS published: Task "${task.title}" assigned to ${task.assigneeId}`);
        } catch (error) {
            this.logger.error(`Failed to publish SNS for task ${task.taskId}`, error);
        }
    }
}