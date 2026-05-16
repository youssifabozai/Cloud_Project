import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AwsService } from '../AWS/aws.service';
import { GetCommand, PutCommand, ScanCommand, DeleteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { CreateProjectDto, ProjectStatus } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
	private readonly logger = new Logger(ProjectsService.name);
	private readonly projectsTableName: string;

	constructor(
		private readonly configService: ConfigService,
		private readonly awsService: AwsService,
	) {
		this.projectsTableName = this.configService.get<string>('TABLE_PROJECTS')!;
		if (!this.projectsTableName) {
			throw new Error('TABLE_PROJECTS environment variable is not set');
		}
	}

	private getErrorDetails(error: unknown) {
		if (error instanceof Error) {
			return { message: error.message, stack: error.stack };
		}
		return { message: 'Unknown error' };
	}

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

	async createProject(dto: CreateProjectDto, currentUser: any) {
		try {
			const projectId = uuidv4();
			const now = new Date().toISOString();

			const project = {
				id: projectId,
				name: dto.name,
				description: dto.description || '',
				status: dto.status || ProjectStatus.ACTIVE,
				deadline: dto.deadline || null,
				managerId: currentUser.userId, // Creator is the manager
				assignedUserIds: dto.assignedUserIds || [],
				assignedTeamIds: dto.assignedTeamIds || [],
				createdAt: now,
				updatedAt: now,
			};

			const command = new PutCommand({
				TableName: this.projectsTableName,
				Item: project,
			});
			await this.awsService.dynamoDbDocClient.send(command);

			return {
				success: true,
				message: 'Project created successfully',
				data: project,
			};
		} catch (error) {
			this.handleDynamoError(error, `createProject`);
		}
	}

	async getProjects(currentUser: any) {
		try {
			const role = currentUser.role?.toUpperCase();
			let projects: any[] = [];
			let lastEvaluatedKey: Record<string, unknown> | undefined;

			do {
				const params: any = {
					TableName: this.projectsTableName,
					ExclusiveStartKey: lastEvaluatedKey,
				};

				if (role !== 'ADMIN') {
					// Employees and Managers only see projects assigned to them
					// or where they are the manager.
					params.FilterExpression = 'contains(assignedUserIds, :userId) OR managerId = :userId';
					params.ExpressionAttributeValues = {
						':userId': currentUser.userId,
					};

					if (currentUser.teamId) {
						params.FilterExpression += ' OR contains(assignedTeamIds, :teamId)';
						params.ExpressionAttributeValues[':teamId'] = currentUser.teamId;
					}
				}

				const command = new ScanCommand(params);
				const result = await this.awsService.dynamoDbDocClient.send(command);

				if (result.Items?.length) {
					projects.push(...result.Items);
				}
				lastEvaluatedKey = result.LastEvaluatedKey;
			} while (lastEvaluatedKey);

			return {
				success: true,
				message: 'Projects fetched successfully',
				data: {
					total: projects.length,
					projects,
				},
			};
		} catch (error) {
			this.handleDynamoError(error, `getProjects`);
		}
	}

	async getProjectById(projectId: string, currentUser: any) {
		try {
			const command = new GetCommand({
				TableName: this.projectsTableName,
				Key: { id: projectId },
			});
			const result = await this.awsService.dynamoDbDocClient.send(command);
			const project = result.Item;

			if (!project) {
				throw new NotFoundException(`Project ${projectId} not found`);
			}

			const role = currentUser.role?.toUpperCase();
			if (role !== 'ADMIN') {
				const isAssignedUser = project.assignedUserIds?.includes(currentUser.userId);
				const isAssignedTeam = currentUser.teamId && project.assignedTeamIds?.includes(currentUser.teamId);
				const isManager = project.managerId === currentUser.userId;

				if (!isAssignedUser && !isAssignedTeam && !isManager) {
					throw new ForbiddenException('Access denied: You are not assigned to this project');
				}
			}

			return {
				success: true,
				data: project,
			};
		} catch (error) {
			this.handleDynamoError(error, `getProjectById(${projectId})`);
		}
	}

	async updateProject(projectId: string, dto: UpdateProjectDto, currentUser: any) {
		try {
			// First get the project to verify it exists and user has access
			const projectRes = await this.getProjectById(projectId, currentUser);
			const project = projectRes.data;

			const updateExpressionParts: string[] = [];
			const expressionAttributeNames: Record<string, string> = {};
			const expressionAttributeValues: Record<string, any> = {};

			if (dto.name !== undefined) {
				updateExpressionParts.push('#n = :n');
				expressionAttributeNames['#n'] = 'name';
				expressionAttributeValues[':n'] = dto.name;
			}
			if (dto.description !== undefined) {
				updateExpressionParts.push('description = :desc');
				expressionAttributeValues[':desc'] = dto.description;
			}
			if (dto.status !== undefined) {
				updateExpressionParts.push('#s = :s');
				expressionAttributeNames['#s'] = 'status';
				expressionAttributeValues[':s'] = dto.status;
			}
			if (dto.deadline !== undefined) {
				updateExpressionParts.push('deadline = :dead');
				expressionAttributeValues[':dead'] = dto.deadline;
			}
			if (dto.assignedUserIds !== undefined) {
				updateExpressionParts.push('assignedUserIds = :aui');
				expressionAttributeValues[':aui'] = dto.assignedUserIds;
			}
			if (dto.assignedTeamIds !== undefined) {
				updateExpressionParts.push('assignedTeamIds = :ati');
				expressionAttributeValues[':ati'] = dto.assignedTeamIds;
			}

			if (updateExpressionParts.length === 0) {
				return { success: true, message: 'No fields to update', data: project };
			}

			updateExpressionParts.push('updatedAt = :ua');
			expressionAttributeValues[':ua'] = new Date().toISOString();

			const command = new UpdateCommand({
				TableName: this.projectsTableName,
				Key: { id: projectId },
				UpdateExpression: `SET ${updateExpressionParts.join(', ')}`,
				ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
				ExpressionAttributeValues: expressionAttributeValues,
				ReturnValues: 'ALL_NEW',
			});

			const result = await this.awsService.dynamoDbDocClient.send(command);

			return {
				success: true,
				message: 'Project updated successfully',
				data: result.Attributes,
			};
		} catch (error) {
			this.handleDynamoError(error, `updateProject(${projectId})`);
		}
	}

	async deleteProject(projectId: string, currentUser: any) {
		try {
			// Get project to ensure it exists and user has access
			await this.getProjectById(projectId, currentUser);

			const command = new DeleteCommand({
				TableName: this.projectsTableName,
				Key: { id: projectId },
			});
			await this.awsService.dynamoDbDocClient.send(command);

			return {
				success: true,
				message: 'Project deleted successfully',
				data: { id: projectId },
			};
		} catch (error) {
			this.handleDynamoError(error, `deleteProject(${projectId})`);
		}
	}

	async assignMember(projectId: string, body: { memberId: string; type: 'USER' | 'TEAM' }, currentUser: any) {
		try {
			const projectRes = await this.getProjectById(projectId, currentUser);
			const project = projectRes.data;

			const updateKey = body.type === 'USER' ? 'assignedUserIds' : 'assignedTeamIds';
			const currentList: string[] = project[updateKey] || [];

			if (currentList.includes(body.memberId)) {
				throw new BadRequestException(`${body.type} is already assigned to this project`);
			}

			currentList.push(body.memberId);

			const command = new UpdateCommand({
				TableName: this.projectsTableName,
				Key: { id: projectId },
				UpdateExpression: `SET ${updateKey} = :list, updatedAt = :ua`,
				ExpressionAttributeValues: {
					':list': currentList,
					':ua': new Date().toISOString(),
				},
				ReturnValues: 'ALL_NEW',
			});

			const result = await this.awsService.dynamoDbDocClient.send(command);

			return {
				success: true,
				message: `${body.type} assigned successfully`,
				data: result.Attributes,
			};
		} catch (error) {
			this.handleDynamoError(error, `assignMember(${projectId})`);
		}
	}

	async removeMember(projectId: string, memberId: string, type: 'USER' | 'TEAM', currentUser: any) {
		try {
			const projectRes = await this.getProjectById(projectId, currentUser);
			const project = projectRes.data;

			const updateKey = type === 'USER' ? 'assignedUserIds' : 'assignedTeamIds';
			const currentList: string[] = project[updateKey] || [];

			const index = currentList.indexOf(memberId);
			if (index === -1) {
				throw new BadRequestException(`${type} is not assigned to this project`);
			}

			currentList.splice(index, 1);

			const command = new UpdateCommand({
				TableName: this.projectsTableName,
				Key: { id: projectId },
				UpdateExpression: `SET ${updateKey} = :list, updatedAt = :ua`,
				ExpressionAttributeValues: {
					':list': currentList,
					':ua': new Date().toISOString(),
				},
				ReturnValues: 'ALL_NEW',
			});

			const result = await this.awsService.dynamoDbDocClient.send(command);

			return {
				success: true,
				message: `${type} removed successfully`,
				data: result.Attributes,
			};
		} catch (error) {
			this.handleDynamoError(error, `removeMember(${projectId})`);
		}
	}
}
