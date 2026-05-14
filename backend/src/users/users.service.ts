import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AwsService } from '../AWS/aws.service';
import { GetCommand, PutCommand, UpdateCommand, DeleteCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { UpdateProfileDto } from './update-profile.dto';

type AuthenticatedUser = {
  userId: string;
  role: string;
  teamId: string;
  email: string;
};

type UserRole = 'ADMIN' | 'MANAGER' | 'EMPLOYEE';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly usersTableName: string;

  private getErrorDetails(error: unknown): { message: string; stack?: string } {
    if (error instanceof Error) {
      return { message: error.message, stack: error.stack };
    }

    return { message: 'Unknown error' };
  }

  private normalizeRole(role: string): UserRole | null {
    const normalizedRole = role?.toUpperCase();
    if (normalizedRole === 'ADMIN' || normalizedRole === 'MANAGER' || normalizedRole === 'EMPLOYEE') {
      return normalizedRole;
    }

    return null;
  }

  private async getAllUsers() {
    const users: any[] = [];
    let lastEvaluatedKey: Record<string, unknown> | undefined;

    do {
      const command = new ScanCommand({
        TableName: this.usersTableName,
        ExclusiveStartKey: lastEvaluatedKey,
      });
      const result = await this.awsService.dynamoDbDocClient.send(command);
      if (result.Items?.length) {
        users.push(...result.Items);
      }
      lastEvaluatedKey = result.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    return users;
  }

  private async getUsersByTeam(teamId: string) {
    try {
      const command = new QueryCommand({
        TableName: this.usersTableName,
        IndexName: 'teamId-index',
        KeyConditionExpression: 'teamId = :teamId',
        ExpressionAttributeValues: {
          ':teamId': teamId,
        },
      });

      const result = await this.awsService.dynamoDbDocClient.send(command);
      return result.Items || [];
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (!message.includes('Index') && !message.includes('ValidationException')) {
        throw error;
      }

      const users: any[] = [];
      let lastEvaluatedKey: Record<string, unknown> | undefined;

      do {
        const command = new ScanCommand({
          TableName: this.usersTableName,
          FilterExpression: 'teamId = :teamId',
          ExpressionAttributeValues: {
            ':teamId': teamId,
          },
          ExclusiveStartKey: lastEvaluatedKey,
        });
        const result = await this.awsService.dynamoDbDocClient.send(command);
        if (result.Items?.length) {
          users.push(...result.Items);
        }
        lastEvaluatedKey = result.LastEvaluatedKey;
      } while (lastEvaluatedKey);

      return users;
    }
  }

  constructor(
    private readonly configService: ConfigService,
    private readonly awsService: AwsService,
  ) {
    this.usersTableName = this.configService.get<string>('TABLE_USERS');
    if (!this.usersTableName) {
      throw new Error('TABLE_USERS environment variable is not set');
    }
  }

  /**
   * Get a user by ID from DynamoDB
   * @param userId - The unique identifier of the user
   * @returns User object or null if not found
   */
  async getUserById(userId: string) {
    try {
      const command = new GetCommand({
        TableName: this.usersTableName,
        Key: { id: userId },
      });
      const result = await this.awsService.dynamoDbDocClient.send(command);
      return result.Item || null;
    } catch (error: unknown) {
      const { message, stack } = this.getErrorDetails(error);
      this.logger.error(`Error fetching user ${userId}: ${message}`, stack);
      throw error;
    }
  }

  /**
   * Create a new user in DynamoDB
   * @param userId - The unique identifier for the user
   * @param userData - The user data to store
   * @returns The created user object
   */
  async createUser(userId: string, userData: any) {
    try {
      const user = {
        id: userId,
        ...userData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const command = new PutCommand({
        TableName: this.usersTableName,
        Item: user,
      });
      await this.awsService.dynamoDbDocClient.send(command);
      return user;
    } catch (error: unknown) {
      const { message, stack } = this.getErrorDetails(error);
      this.logger.error(`Error creating user: ${message}`, stack);
      throw error;
    }
  }

  /**
   * Update an existing user in DynamoDB
   * @param userId - The unique identifier of the user
   * @param updateData - The data to update
   * @returns The updated user object
   */
  async updateUser(userId: string, updateData: any) {
    try {
      const timestamp = new Date().toISOString();
      const updateExpression = Object.keys(updateData)
        .map((key) => `${key} = :${key}`)
        .join(', ');
      const expressionAttributeValues = Object.keys(updateData).reduce(
        (acc, key) => {
          acc[`:${key}`] = updateData[key];
          return acc;
        },
        { ':updatedAt': timestamp },
      );

      const command = new UpdateCommand({
        TableName: this.usersTableName,
        Key: { id: userId },
        UpdateExpression: `SET ${updateExpression}, updatedAt = :updatedAt`,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
      });
      const result = await this.awsService.dynamoDbDocClient.send(command);
      return result.Attributes;
    } catch (error: unknown) {
      const { message, stack } = this.getErrorDetails(error);
      this.logger.error(`Error updating user ${userId}: ${message}`, stack);
      throw error;
    }
  }

  /**
   * Delete a user from DynamoDB
   * @param userId - The unique identifier of the user
   */
  async deleteUser(userId: string) {
    try {
      const command = new DeleteCommand({
        TableName: this.usersTableName,
        Key: { id: userId },
      });
      await this.awsService.dynamoDbDocClient.send(command);
    } catch (error: unknown) {
      const { message, stack } = this.getErrorDetails(error);
      this.logger.error(`Error deleting user ${userId}: ${message}`, stack);
      throw error;
    }
  }

  /**
   * Query users by a specific attribute (e.g., email, team)
   * @param indexName - The GSI index name to query on
   * @param keyConditionExpression - The key condition expression
   * @param expressionAttributeValues - The attribute values for the expression
   * @returns Array of matching users
   */
  async queryUsers(
    indexName: string,
    keyConditionExpression: string,
    expressionAttributeValues: any,
  ) {
    try {
      const command = new QueryCommand({
        TableName: this.usersTableName,
        IndexName: indexName,
        KeyConditionExpression: keyConditionExpression,
        ExpressionAttributeValues: expressionAttributeValues,
      });
      const result = await this.awsService.dynamoDbDocClient.send(command);
      return result.Items || [];
    } catch (error: unknown) {
      const { message, stack } = this.getErrorDetails(error);
      this.logger.error(`Error querying users: ${message}`, stack);
      throw error;
    }
  }

  async getCurrentUserProfile(currentUser: AuthenticatedUser) {
    const userRecord = await this.getUserById(currentUser.userId);

    return {
      success: true,
      message: 'Current user profile fetched successfully',
      data: {
        userId: currentUser.userId,
        role: currentUser.role,
        teamId: currentUser.teamId,
        email: currentUser.email,
        profile: userRecord,
      },
    };
  }

  async getUsers(currentUser: AuthenticatedUser) {
    try {
      const role = this.normalizeRole(currentUser.role);
      if (!role) {
        throw new ForbiddenException('Access denied: unsupported user role');
      }

      let users: any[] = [];
      if (role === 'ADMIN' || role === 'MANAGER') {
        users = await this.getAllUsers();
      } else {
        users = await this.getUsersByTeam(currentUser.teamId);
      }

      return {
        success: true,
        message: 'Users fetched successfully',
        data: {
          scope: role === 'EMPLOYEE' ? 'TEAM' : 'ALL',
          total: users.length,
          users,
        },
      };
    } catch (error: unknown) {
      const { message, stack } = this.getErrorDetails(error);
      this.logger.error(`Error fetching users list: ${message}`, stack);
      throw error;
    }
  }

  async updateUserProfile(userId: string, currentUser: AuthenticatedUser, dto: UpdateProfileDto) {
    try {
      // Enforce that users can only update their own profile
      if (currentUser.userId !== userId) {
        throw new ForbiddenException('Users can only update their own profile');
      }

      const allowedKeys = ['fullName', 'avatar', 'phoneNumber'];
      const updateData: Record<string, unknown> = {};
      for (const key of allowedKeys) {
        if ((dto as any)[key] !== undefined) {
          updateData[key] = (dto as any)[key];
        }
      }

      if (Object.keys(updateData).length === 0) {
        const userRecord = await this.getUserById(userId);
        return {
          success: true,
          message: 'No changes applied to profile',
          data: userRecord,
        };
      }

      const updated = await this.updateUser(userId, updateData);
      return {
        success: true,
        message: 'Profile updated successfully',
        data: updated,
      };
    } catch (error: unknown) {
      const { message, stack } = this.getErrorDetails(error);
      this.logger.error(`Error updating profile for ${userId}: ${message}`, stack);
      throw error;
    }
  }

  /**
   * Assign a user to a team. Only ADMIN can perform this action.
   * Validates team existence in TABLE_TEAMS and updates the user's teamId.
   */
  async assignUserToTeam(userId: string, teamId: string, currentUser: AuthenticatedUser) {
    try {
      const role = this.normalizeRole(currentUser.role);
      if (role !== 'ADMIN') {
        throw new ForbiddenException('Only ADMIN users can assign teams');
      }

      // Validate team existence in DynamoDB
      const teamsTable = this.configService.get<string>('TABLE_TEAMS');
      if (!teamsTable) {
        throw new Error('TABLE_TEAMS environment variable is not set');
      }

      const teamGet = new GetCommand({
        TableName: teamsTable,
        Key: { id: teamId },
      });
      const teamResult = await this.awsService.dynamoDbDocClient.send(teamGet);
      if (!teamResult.Item) {
        const message = `Team ${teamId} not found`;
        this.logger.warn(message);
        throw new NotFoundException(message);
      }

      // Update user's teamId
      const updated = await this.updateUser(userId, { teamId });

      return {
        success: true,
        message: `User ${userId} assigned to team ${teamId}`,
        data: updated,
      };
    } catch (error: unknown) {
      const { message, stack } = this.getErrorDetails(error);
      this.logger.error(`Error assigning user ${userId} to team ${teamId}: ${message}`, stack);
      throw error;
    }
  }

  /**
   * Assign a role to a user. Only ADMIN may perform this.
   */
  async assignUserRole(userId: string, role: string, currentUser: AuthenticatedUser) {
    try {
      const callerRole = this.normalizeRole(currentUser.role);
      if (callerRole !== 'ADMIN') {
        throw new ForbiddenException('Only ADMIN users can change roles');
      }

      const newRole = this.normalizeRole(role);
      if (!newRole) {
        throw new Error('Invalid role');
      }

      const updated = await this.updateUser(userId, { role: newRole });

      return {
        success: true,
        message: `User ${userId} role updated to ${newRole}`,
        data: updated,
      };
    } catch (error: unknown) {
      const { message, stack } = this.getErrorDetails(error);
      this.logger.error(`Error assigning role to user ${userId}: ${message}`, stack);
      if (message === 'Invalid role') {
        throw new ForbiddenException('Invalid role specified');
      }
      throw error;
    }
  }

  /**
   * Fetch users for a specific team. Only ADMIN and MANAGER may call this.
   * @param teamId - the team identifier to fetch users for
   * @param currentUser - the caller's authenticated identity
   */
  async getUsersForTeam(teamId: string, currentUser: AuthenticatedUser) {
    try {
      const role = this.normalizeRole(currentUser.role);
      if (!role) {
        throw new ForbiddenException('Access denied: unsupported user role');
      }

      if (role !== 'ADMIN' && role !== 'MANAGER') {
        throw new ForbiddenException('Access denied: insufficient permissions');
      }

      if (!teamId) {
        throw new Error('teamId parameter is required');
      }

      const users = await this.getUsersByTeam(teamId);

      return {
        success: true,
        message: `Users for team ${teamId} fetched successfully`,
        data: {
          teamId,
          total: users.length,
          users,
        },
      };
    } catch (error: unknown) {
      const { message, stack } = this.getErrorDetails(error);
      this.logger.error(`Error fetching users for team ${teamId}: ${message}`, stack);
      throw error;
    }
  }
}
