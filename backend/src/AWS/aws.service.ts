import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { S3Client } from '@aws-sdk/client-s3';
import { SNSClient } from '@aws-sdk/client-sns';
import { SQSClient } from '@aws-sdk/client-sqs';
import { ListTablesCommand } from '@aws-sdk/client-dynamodb';

@Injectable()
export class AwsService {
  public readonly dynamoDbClient: DynamoDBClient;
  public readonly dynamoDbDocClient: DynamoDBDocumentClient;
  public readonly s3Client: S3Client;
  public readonly snsClient: SNSClient;
  public readonly sqsClient: SQSClient;

  constructor(private readonly configService: ConfigService) {
    const region = this.configService.get<string>('AWS_REGION') || 'us-east-1';

    // In local development, the SDK uses credentials from the environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY) 
    // or from the shared credentials file (~/.aws/credentials).
    // In production, EC2 instances will use their attached IAM roles automatically.
    this.dynamoDbClient = new DynamoDBClient({ region });
    this.dynamoDbDocClient = DynamoDBDocumentClient.from(this.dynamoDbClient, {
      marshallOptions: { removeUndefinedValues: true },
    });
    this.s3Client = new S3Client({ region });
    this.snsClient = new SNSClient({ region });
    this.sqsClient = new SQSClient({ region });
  }

  async testConnection() {
    try {
      const command = new ListTablesCommand({});
      const response = await this.dynamoDbClient.send(command);
      return {
        status: 'Connected successfully!',
        tablesFound: response.TableNames,
      };
    } catch (error) {
      console.error('AWS Connection Error:', error);
      return {
        status: 'Failed to connect.',
        error: error.message,
      };
    }
  }
}
