import { BadRequestException, ConflictException, ForbiddenException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AwsService } from '../AWS/aws.service';
import { GetCommand, QueryCommand, PutCommand, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { CreateTeamDto } from './create-team.dto';

@Injectable()
export class TeamsService {
	private readonly logger = new Logger(TeamsService.name);
	private readonly teamsTableName: string;
	private readonly usersTableName: string;

	constructor(
		private readonly configService: ConfigService,
		private readonly awsService: AwsService,
	) {
		this.teamsTableName = this.configService.get<string>('TABLE_TEAMS');
		if (!this.teamsTableName) {
			throw new Error('TABLE_TEAMS environment variable is not set');
		}
		this.usersTableName = this.configService.get<string>('TABLE_USERS');
		if (!this.usersTableName) {
			throw new Error('TABLE_USERS environment variable is not set');
		}
	}

	private getErrorDetails(error: unknown) {
		if (error instanceof Error) {
			return { message: error.message, stack: error.stack };
		}
		return { message: 'Unknown error' };
	}

	/**
	 * Maps known AWS DynamoDB SDK errors to proper NestJS HttpExceptions.
	 * Re-throws NestJS HttpExceptions unchanged.
	 */
	private handleDynamoError(error: unknown, context: string): never {
		const { HttpException } = require('@nestjs/common');
		if (error instanceof HttpException) throw error;

		const { message, stack } = this.getErrorDetails(error);
		this.logger.error(`[${context}] ${message}`, stack);

		const code = (error as any)?.name ?? (error as any)?.__type ?? '';
		if (code === 'ResourceNotFoundException') {
			throw new NotFoundException('The requested DynamoDB resource was not found');
		}
		if (code === 'ValidationException') {
			throw new BadRequestException(`DynamoDB validation error: ${message}`);
		}
		if (
			code === 'ProvisionedThroughputExceededException' ||
			code === 'RequestLimitExceeded' ||
			code === 'ThrottlingException'
		) {
			throw new InternalServerErrorException('Service is temporarily unavailable. Please retry.');
		}

		throw new InternalServerErrorException('An unexpected error occurred. Please try again later.');
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
	 * Fetch a single team by id with role-based authorization.
	 * - EMPLOYEE: can only access their own team
	 * - MANAGER / ADMIN: can access any team
	 */
	async getTeamByIdForUser(teamId: string, currentUser: any) {
		try {
			const role = currentUser.role?.toUpperCase();
			if (!role || !['ADMIN', 'MANAGER', 'EMPLOYEE'].includes(role)) {
				throw new ForbiddenException('Access denied: unsupported user role');
			}

			// EMPLOYEE is restricted to their own assigned team
			if (role === 'EMPLOYEE' && currentUser.teamId !== teamId) {
				throw new ForbiddenException('Access denied: employees can only view their own team');
			}

			const team = await this.getTeamById(teamId);

			if (!team) {
				throw new NotFoundException(`Team ${teamId} not found`);
			}

			return {
				success: true,
				message: 'Team fetched successfully',
				data: team,
			};
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
				throw new ForbiddenException('Access denied: unsupported user role');
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
			this.handleDynamoError(error, 'getTeams');
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
			this.handleDynamoError(error, `createTeam(${dto?.name})`);
		}
	}

	/**
	 * Delete a team (ADMIN only).
	 * Prevents deletion when the team still has users assigned to it.
	 */
	async deleteTeam(teamId: string, currentUser: any) {
		try {
			const role = currentUser.role?.toUpperCase();
			if (role !== 'ADMIN') {
				throw new ForbiddenException('Access denied: only ADMIN can delete teams');
			}

			// 1. Verify the team exists
			const team = await this.getTeamById(teamId);
			if (!team) {
				throw new NotFoundException(`Team ${teamId} not found`);
			}

			// 2. Guard: refuse deletion when team still has members
			const membersResult = await this.awsService.dynamoDbDocClient.send(
				new QueryCommand({
					TableName: this.usersTableName,
					IndexName: 'teamId-index',
					KeyConditionExpression: 'teamId = :teamId',
					ExpressionAttributeValues: { ':teamId': teamId },
					// We only need to know if at least one member exists
					Limit: 1,
					Select: 'COUNT',
				}),
			);

			const memberCount = membersResult.Count ?? 0;
			if (memberCount > 0) {
				throw new ConflictException(
					`Cannot delete team "${team.name}": it still has ${memberCount} member(s). Reassign or remove all users first.`,
				);
			}

			// 3. Delete the team
			await this.awsService.dynamoDbDocClient.send(
				new DeleteCommand({
					TableName: this.teamsTableName,
					Key: { id: teamId },
				}),
			);

			this.logger.log(`Team ${teamId} deleted by admin ${currentUser.userId}`);

			return {
				success: true,
				message: `Team "${team.name}" deleted successfully`,
				data: { teamId },
			};
		} catch (error: unknown) {
			this.handleDynamoError(error, `deleteTeam(${teamId})`);
		}
	}
}
