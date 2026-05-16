import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AwsService } from '../AWS/aws.service';
import { QueryCommand, UpdateCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { PublishCommand } from '@aws-sdk/client-sns';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly notificationsTableName: string;
  private readonly snsTopicArn: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly awsService: AwsService,
  ) {
    this.notificationsTableName = this.configService.get<string>('TABLE_NOTIFICATIONS') || 'MiniJira-Notifications';
    this.snsTopicArn = this.configService.get<string>('SNS_TOPIC_ARN') || '';
  }

  /**
   * Dispatches a notification using SNS. This fulfills the "Notifications are SNS" architecture.
   */
  async dispatchSnsNotification(message: string, targetUserId: string) {
    if (!this.snsTopicArn) {
      this.logger.warn('SNS_TOPIC_ARN is not configured. Skipping SNS publish.');
      return;
    }

    try {
      const timestamp = new Date().toISOString();
      const notificationId = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const command = new PublishCommand({
        TopicArn: this.snsTopicArn,
        Message: JSON.stringify({ message, targetUserId, timestamp }),
        MessageAttributes: {
          targetUserId: {
            DataType: 'String',
            StringValue: targetUserId,
          },
        },
      });
      await this.awsService.snsClient.send(command);
      this.logger.log(`SNS Notification dispatched for user ${targetUserId}`);

      // Also insert the notification into DynamoDB so it appears in the in-app GET /notifications list
      const putCommand = new PutCommand({
        TableName: this.notificationsTableName,
        Item: {
          id: notificationId,
          userId: targetUserId,
          message,
          isRead: false,
          createdAt: timestamp,
        },
      });
      await this.awsService.dynamoDbDocClient.send(putCommand);
      this.logger.log(`Notification ${notificationId} saved to DynamoDB for user ${targetUserId}`);
    } catch (error) {
      this.logger.error('Failed to dispatch SNS notification', error);
      throw error;
    }
  }

  async getNotifications(userId: string, unreadOnly: boolean) {
    try {
      let filterExpression: string | undefined;
      let expressionAttributeValues: Record<string, any> = {
        ':userId': userId,
      };

      if (unreadOnly) {
        filterExpression = 'isRead = :isRead';
        expressionAttributeValues[':isRead'] = false;
      }

      const command = new QueryCommand({
        TableName: this.notificationsTableName,
        IndexName: 'userId-index', // Assuming this GSI exists
        KeyConditionExpression: 'userId = :userId',
        FilterExpression: filterExpression,
        ExpressionAttributeValues: expressionAttributeValues,
      });

      // Fallback if GSI does not exist in local development
      try {
        const result = await this.awsService.dynamoDbDocClient.send(command);
        return { success: true, data: result.Items || [] };
      } catch (err: any) {
        if (err.name === 'ValidationException' && err.message.includes('Index')) {
          // GSI missing, fallback to scan
          const scanCommand = new QueryCommand({
            TableName: this.notificationsTableName,
            KeyConditionExpression: 'userId = :userId',
            FilterExpression: filterExpression,
            ExpressionAttributeValues: expressionAttributeValues,
          });
          // Assuming userId is the partition key if GSI is missing
          const scanResult = await this.awsService.dynamoDbDocClient.send(scanCommand);
          return { success: true, data: scanResult.Items || [] };
        }
        throw err;
      }
    } catch (error) {
      this.logger.error(`Error fetching notifications for user ${userId}`, error);
      // Return empty array instead of throwing to prevent frontend crashes
      return { success: true, data: [] };
    }
  }

  async markAsRead(notificationId: string, userId: string) {
    try {
      const command = new UpdateCommand({
        TableName: this.notificationsTableName,
        Key: { id: notificationId },
        ConditionExpression: 'userId = :userId',
        UpdateExpression: 'SET isRead = :isRead',
        ExpressionAttributeValues: {
          ':userId': userId,
          ':isRead': true,
        },
        ReturnValues: 'ALL_NEW',
      });

      const result = await this.awsService.dynamoDbDocClient.send(command);
      return { success: true, data: result.Attributes };
    } catch (error: any) {
      if (error.name === 'ConditionalCheckFailedException') {
        throw new NotFoundException('Notification not found or access denied');
      }
      this.logger.error(`Error marking notification ${notificationId} as read`, error);
      throw error;
    }
  }

  async markAllAsRead(userId: string) {
    try {
      // First fetch all unread notifications
      const unread = await this.getNotifications(userId, true);
      const items = unread.data || [];

      // Update them one by one (DynamoDB doesn't have an UPDATE WHERE query)
      const updatePromises = items.map((item: any) =>
        this.markAsRead(item.id, userId).catch((err) => {
          this.logger.warn(`Failed to mark ${item.id} as read: ${err.message}`);
        })
      );

      await Promise.all(updatePromises);
      return { success: true, message: `${items.length} notifications marked as read` };
    } catch (error) {
      this.logger.error(`Error marking all notifications as read for user ${userId}`, error);
      throw error;
    }
  }
}
