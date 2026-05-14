import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AwsService } from '../AWS/aws.service';
import { GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

@Injectable()
export class TeamsService {
	private readonly logger = new Logger(TeamsService.name);
	private readonly teamsTableName: string;

	constructor(
		private readonly configService: ConfigService,
		private readonly awsService: AwsService,
	) {
		this.teamsTableName = this.configService.get<string>('TABLE_TEAMS');
		if (!this.teamsTableName) {
			throw new Error('TABLE_TEAMS environment variable is not set');
		}
	}

	private getErrorDetails(error: unknown) {
		if (error instanceof Error) {
			return { message: error.message, stack: error.stack };
		}
		return { message: 'Unknown error' };
	}

	/**
	 * Fetch a team by id from DynamoDB
	 */
	async getTeamById(teamId: string) {
		try {
			const command = new GetCommand({
				TableName: this.teamsTableName,
				Key: { id: teamId },
			});
			const result = await this.awsService.dynamoDbDocClient.send(command);
			return result.Item || null;
		} catch (error: unknown) {
			const { message, stack } = this.getErrorDetails(error);
			this.logger.error(`Error fetching team ${teamId}: ${message}`, stack);
			throw error;
		}
	}

	/**
	 * Placeholder: query teams by an attribute (e.g., organization)
	 */
	async queryTeamsByIndex(indexName: string, keyConditionExpression: string, expressionAttributeValues: any) {
		try {
			const command = new QueryCommand({
				TableName: this.teamsTableName,
				IndexName: indexName,
				KeyConditionExpression: keyConditionExpression,
				ExpressionAttributeValues: expressionAttributeValues,
			});
			const result = await this.awsService.dynamoDbDocClient.send(command);
			return result.Items || [];
		} catch (error: unknown) {
			const { message, stack } = this.getErrorDetails(error);
			this.logger.error(`Error querying teams: ${message}`, stack);
			throw error;
		}
	}
}
