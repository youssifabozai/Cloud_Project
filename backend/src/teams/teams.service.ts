import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AwsService } from '../AWS/aws.service';
import { GetCommand, QueryCommand, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { CreateTeamDto } from './create-team.dto';

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

	/**
	 * Fetch teams based on user role (EMPLOYEE: own team only, MANAGER/ADMIN: all teams)
	 */
	async getTeams(currentUser: any) {
		try {
			const role = currentUser.role?.toUpperCase();
			if (!role || !['ADMIN', 'MANAGER', 'EMPLOYEE'].includes(role)) {
				throw new Error('Invalid or missing user role');
			}

			let teams: any[] = [];

			// EMPLOYEE can only see their own team
			if (role === 'EMPLOYEE') {
				if (!currentUser.teamId) {
					this.logger.warn(`Employee ${currentUser.userId} has no assigned team`);
					return {
						success: true,
						message: 'User is not assigned to any team',
						data: {
							scope: 'SELF',
							total: 0,
							teams: [],
						},
					};
				}
				const team = await this.getTeamById(currentUser.teamId);
				if (team) {
					teams = [team];
				}
			} else {
				// MANAGER and ADMIN can see all teams
				teams = await this.getAllTeams();
			}

			return {
				success: true,
				message: `Teams fetched successfully (scope: ${role === 'EMPLOYEE' ? 'SELF' : 'ALL'})`,
				data: {
					scope: role === 'EMPLOYEE' ? 'SELF' : 'ALL',
					total: teams.length,
					teams,
				},
			};
		} catch (error: unknown) {
			const { message, stack } = this.getErrorDetails(error);
			this.logger.error(`Error fetching teams: ${message}`, stack);
			throw error;
		}
	}

	/**
	 * Fetch all teams from DynamoDB using paginated scan
	 */
	private async getAllTeams(): Promise<any[]> {
		try {
			const teams: any[] = [];
			let lastEvaluatedKey: Record<string, unknown> | undefined;

			do {
				const command = new ScanCommand({
					TableName: this.teamsTableName,
					ExclusiveStartKey: lastEvaluatedKey,
				});
				const result = await this.awsService.dynamoDbDocClient.send(command);
				if (result.Items?.length) {
					teams.push(...result.Items);
				}
				lastEvaluatedKey = result.LastEvaluatedKey;
			} while (lastEvaluatedKey);

			return teams;
		} catch (error: unknown) {
			const { message, stack } = this.getErrorDetails(error);
			this.logger.error(`Error scanning all teams: ${message}`, stack);
			throw error;
		}
	}

	/**
	 * Check if a team name already exists (scan for duplicate)
	 */
	private async teamNameExists(name: string): Promise<boolean> {
		try {
			const command = new ScanCommand({
				TableName: this.teamsTableName,
				FilterExpression: '#name = :name',
				ExpressionAttributeNames: { '#name': 'name' },
				ExpressionAttributeValues: { ':name': name },
			});
			const result = await this.awsService.dynamoDbDocClient.send(command);
			return (result.Items?.length ?? 0) > 0;
		} catch (error: unknown) {
			const { message, stack } = this.getErrorDetails(error);
			this.logger.error(`Error checking team name uniqueness: ${message}`, stack);
			throw error;
		}
	}

	/**
	 * Create a new team in DynamoDB (ADMIN only)
	 */
	async createTeam(dto: CreateTeamDto, currentUser: any) {
		try {
			const teamId = uuidv4();
			const now = new Date().toISOString();

			// Validate duplicate team name
			const exists = await this.teamNameExists(dto.name);
			if (exists) {
				throw new ConflictException(`Team name "${dto.name}" already exists`);
			}

			const team = {
				id: teamId,
				name: dto.name,
				description: dto.description || '',
				createdAt: now,
				updatedAt: now,
				createdBy: currentUser.userId,
			};

			const command = new PutCommand({
				TableName: this.teamsTableName,
				Item: team,
			});
			await this.awsService.dynamoDbDocClient.send(command);

			return {
				success: true,
				message: 'Team created successfully',
				data: team,
			};
		} catch (error: unknown) {
			const { message, stack } = this.getErrorDetails(error);
			this.logger.error(`Error creating team: ${message}`, stack);
			throw error;
		}
	}
}
