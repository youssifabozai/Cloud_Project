import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AwsService } from '../AWS/aws.service';
import { GetCommand, PutCommand, UpdateCommand, DeleteCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import {
  CognitoIdentityProviderClient,
  AdminDeleteUserCommand,
  AdminUpdateUserAttributesCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Role } from '../common/decorators/roles.decorator';

type AuthenticatedUser = {
  userId: string;
  role: string;
  teamId: string;
  email: string;
};

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly usersTableName: string;
  private readonly teamsTableName: string;
  private readonly cognitoClient: CognitoIdentityProviderClient;
  private readonly userPoolId: string;

  private getErrorDetails(error: unknown): { message: string; stack?: string } {
    if (error instanceof Error) {
      return { message: error.message, stack: error.stack };
    }
    return { message: 'Unknown error' };
  }

  /**
   * Maps known AWS DynamoDB SDK errors to proper NestJS HttpExceptions.
   * Re-throws NestJS HttpExceptions unchanged so business logic exceptions
   * (ForbiddenException, NotFoundException, etc.) are never swallowed.
   */
  private handleDynamoError(error: unknown, context: string): never {
    // Re-throw HttpExceptions as-is (ForbiddenException, NotFoundException, etc.)
    const { HttpException } = require('@nestjs/common');
    if (error instanceof HttpException) throw error;

    const { message, stack } = this.getErrorDetails(error);
    this.logger.error(`[${context}] ${message}`, stack);

    // Map known AWS SDK error codes
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

  private normalizeRole(role: string): Role | null {
    const normalizedRole = role?.toUpperCase();
    if (normalizedRole === Role.ADMIN || normalizedRole === Role.MANAGER || normalizedRole === Role.EMPLOYEE) {
      return normalizedRole as Role;
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

  async getUsersByTeamId(teamId: string) {
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
    this.usersTableName = this.configService.get<string>('TABLE_USERS')!;
    if (!this.usersTableName) {
      throw new Error('TABLE_USERS environment variable is not set');
    }
    this.teamsTableName = this.configService.get<string>('TABLE_TEAMS')!;
    if (!this.teamsTableName) {
      throw new Error('TABLE_TEAMS environment variable is not set');
    }
    this.userPoolId = this.configService.get<string>('COGNITO_USER_POOL_ID')!;
    this.cognitoClient = new CognitoIdentityProviderClient({
      region: this.configService.get<string>('AWS_REGION') || 'us-east-1',
    });
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
        Key: { userId },
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
   * Fallback lookup for legacy records that were saved with the email as the key
   * instead of the Cognito `sub`.
   */
  async getUserByEmail(email: string) {
    try {
      if (!email?.trim()) {
        return null;
      }

      const targetEmail = email.trim().toLowerCase();
      const users = await this.getAllUsers();
      return users.find((user) => (user.email ?? '').toString().trim().toLowerCase() === targetEmail) ?? null;
    } catch (error: unknown) {
      const { message, stack } = this.getErrorDetails(error);
      this.logger.error(`Error fetching user by email ${email}: ${message}`, stack);
      throw error;
    }
  }

  private async syncUserToCognito(user: { email?: string; fullName?: string; role?: string; teamId?: string }) {
    if (!user.email?.trim()) {
      return;
    }

    const userAttributes = [
      { Name: 'email', Value: user.email },
      { Name: 'name', Value: user.fullName ?? '' },
      { Name: 'custom:role', Value: (user.role ?? 'EMPLOYEE').toUpperCase() },
      { Name: 'custom:team', Value: user.teamId ?? '' },
    ].filter((attr) => attr.Value !== undefined);

    await this.cognitoClient.send(
      new AdminUpdateUserAttributesCommand({
        UserPoolId: this.userPoolId,
        Username: user.email,
        UserAttributes: userAttributes,
      }),
    );
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
        userId,
        ...userData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const command = new PutCommand({
        TableName: this.usersTableName,
        Item: user,
      });
      await this.awsService.dynamoDbDocClient.send(command);
      await this.syncUserToCognito(user);
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
      const expressionAttributeNames: Record<string, string> = {};
      const expressionAttributeValues: Record<string, any> = {
        ':updatedAt': timestamp,
      };

      const updateExpressionParts = Object.keys(updateData).map((key) => {
        const attributeName = `#${key}`;
        const attributeValue = `:${key}`;
        expressionAttributeNames[attributeName] = key;
        expressionAttributeValues[attributeValue] = updateData[key];
        return `${attributeName} = ${attributeValue}`;
      });

      const command = new UpdateCommand({
        TableName: this.usersTableName,
        Key: { userId },
        UpdateExpression: `SET ${updateExpressionParts.join(', ')}, updatedAt = :updatedAt`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
      });
      const result = await this.awsService.dynamoDbDocClient.send(command);
      if (result.Attributes) {
        await this.syncUserToCognito(result.Attributes as any);
      }
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
        Key: { userId },
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
    try {
      const userRecord = await this.getUserById(currentUser.userId);
      if (!userRecord) {
        throw new NotFoundException(`User ${currentUser.userId} not found`);
      }
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
    } catch (error: unknown) {
      this.handleDynamoError(error, 'getCurrentUserProfile');
    }
  }

  async getUsers(currentUser: AuthenticatedUser) {
    try {
      const role = this.normalizeRole(currentUser.role);
      if (!role) {
        throw new ForbiddenException('Access denied: unsupported user role');
      }

      let users: any[] = [];
      if (role === Role.ADMIN || role === Role.MANAGER) {
        users = await this.getAllUsers();
      } else {
        users = await this.getUsersByTeamId(currentUser.teamId);
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
      if (role !== Role.ADMIN) {
        throw new ForbiddenException('Only ADMIN users can assign teams');
      }

      if (!userId?.trim()) {
        throw new BadRequestException('userId is required');
      }
      if (!teamId?.trim()) {
        throw new BadRequestException('teamId is required');
      }

      // Validate team existence using the already-resolved table name
      const teamGet = new GetCommand({
        TableName: this.teamsTableName,
        Key: { teamId: teamId },
      });
      const teamResult = await this.awsService.dynamoDbDocClient.send(teamGet);
      if (!teamResult.Item) {
        throw new NotFoundException(`Team ${teamId} not found`);
      }

      // Validate user existence
      const userRecord = await this.getUserById(userId);
      if (!userRecord) {
        throw new NotFoundException(`User ${userId} not found`);
      }

      const updated = await this.updateUser(userId, { teamId });

      return {
        success: true,
        message: `User ${userId} assigned to team ${teamId}`,
        data: updated,
      };
    } catch (error: unknown) {
      this.handleDynamoError(error, `assignUserToTeam(${userId}, ${teamId})`);
    }
  }

  /**
   * Assign a role to a user. Only ADMIN may perform this.
   */
  async assignUserRole(userId: string, role: string, currentUser: AuthenticatedUser) {
    try {
      const callerRole = this.normalizeRole(currentUser.role);
      if (callerRole !== Role.ADMIN) {
        throw new ForbiddenException('Only ADMIN users can change roles');
      }

      if (!userId?.trim()) {
        throw new BadRequestException('userId is required');
      }

      const newRole = this.normalizeRole(role);
      if (!newRole) {
        throw new BadRequestException(`Invalid role "${role}". Must be one of: ADMIN, MANAGER, EMPLOYEE`);
      }

      const userRecord = await this.getUserById(userId);
      if (!userRecord) {
        throw new NotFoundException(`User ${userId} not found`);
      }

      const updated = await this.updateUser(userId, { role: newRole });

      return {
        success: true,
        message: `User ${userId} role updated to ${newRole}`,
        data: updated,
      };
    } catch (error: unknown) {
      this.handleDynamoError(error, `assignUserRole(${userId})`);
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
      if (role !== Role.ADMIN && role !== Role.MANAGER) {
        throw new ForbiddenException('Access denied: only ADMIN and MANAGER can view team members');
      }
      if (!teamId?.trim()) {
        throw new BadRequestException('teamId parameter is required');
      }

      const users = await this.getUsersByTeamId(teamId);

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
      this.handleDynamoError(error, `getUsersForTeam(${teamId})`);
    }
  }

  /**
   * Elevate a user to ADMIN. Only ADMIN may perform this action.
   * Business rules:
   *  - Caller must be ADMIN.
   *  - Target user must exist.
   *  - Prevent duplicate admin elevation.
   */
  async elevateToAdmin(userId: string, currentUser: AuthenticatedUser) {
    try {
      const callerRole = this.normalizeRole(currentUser.role);
      if (callerRole !== Role.ADMIN) {
        throw new ForbiddenException('Access denied: only ADMIN users can elevate accounts');
      }

      if (!userId?.trim()) {
        throw new BadRequestException('userId parameter is required');
      }

      // Verify the target user exists
      const targetUser = await this.getUserById(userId);
      if (!targetUser) {
        throw new NotFoundException(`User ${userId} not found`);
      }

      // Prevent duplicate elevation
      const targetRole = this.normalizeRole(targetUser.role ?? '');
      if (targetRole === Role.ADMIN) {
        throw new BadRequestException(`User ${userId} is already an ADMIN`);
      }

      const updated = await this.updateUser(userId, { role: 'ADMIN' });

      this.logger.log(`User ${userId} elevated to ADMIN by admin ${currentUser.userId}`);

      return {
        success: true,
        message: `User ${userId} elevated to ADMIN successfully`,
        data: updated,
      };
    } catch (error: unknown) {
      this.handleDynamoError(error, `elevateToAdmin(${userId})`);
    }
  }

  /**
   * Delete a user by ID. Only ADMIN may perform this action.
   * Business rules:
   *  - Caller must be ADMIN.
   *  - Target user must exist.
   *  - ADMIN cannot delete themselves.
   *  - ADMIN cannot delete other ADMIN accounts.
   */
  async removeUser(userId: string, currentUser: AuthenticatedUser) {
    try {
      const callerRole = this.normalizeRole(currentUser.role);
      if (callerRole !== Role.ADMIN) {
        throw new ForbiddenException('Access denied: only ADMIN users can delete accounts');
      }

      if (!userId?.trim()) {
        throw new BadRequestException('userId parameter is required');
      }

      // Prevent self-deletion
      if (currentUser.userId === userId) {
        throw new BadRequestException('You cannot delete your own account');
      }

      // Verify the target user exists
      const targetUser = await this.getUserById(userId);
      if (!targetUser) {
        throw new NotFoundException(`User ${userId} not found`);
      }

      // Prevent deleting other ADMIN accounts
      const targetRole = this.normalizeRole(targetUser.role ?? '');
      if (targetRole === Role.ADMIN) {
        throw new ForbiddenException('Cannot delete an ADMIN account');
      }

      await this.deleteUser(userId);

      // Delete from Cognito
      if (targetUser.email) {
        try {
          await this.cognitoClient.send(
            new AdminDeleteUserCommand({
              UserPoolId: this.userPoolId,
              Username: targetUser.email,
            }),
          );
        } catch (e) {
          this.logger.error(`Failed to delete user ${targetUser.email} from Cognito`, e);
        }
      }

      this.logger.log(`User ${userId} deleted by admin ${currentUser.userId}`);

      return {
        success: true,
        message: `User ${userId} deleted successfully`,
      };
    } catch (error: unknown) {
      this.handleDynamoError(error, `removeUser(${userId})`);
    }
  }

  // ---------------------------------------------------------------------------
  // Org Chart

  // ---------------------------------------------------------------------------

  /**
   * Fetch all teams from DynamoDB (paginated scan).
   */
  private async getAllTeams(): Promise<any[]> {
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
  }

  /**
   * Strip sensitive fields from a user object for EMPLOYEE-scoped responses.
   */
  private toPublicUser(user: any) {
    return {
      userId: user.userId,
      fullName: user.fullName ?? null,
      email: user.email,
      role: user.role,
      teamId: user.teamId ?? null,
      avatar: user.avatar ?? null,
    };
  }

  /**
   * Return the full user record minus the password hash.
   */
  private toFullUser(user: any) {
    const { passwordHash, password, ...rest } = user;
    return { ...rest, userId: user.userId };
  }

  /**
   * Build and return the hierarchical org chart.
   *
   * - ADMIN / MANAGER  → full tree: admins, managers, teams with members
   * - EMPLOYEE         → restricted view: own team only, public fields only
   */
  async getOrgChart(currentUser: AuthenticatedUser) {
    try {
      const role = this.normalizeRole(currentUser.role);
      if (!role) {
        throw new ForbiddenException('Access denied: unsupported user role');
      }

      // Fetch all users and all teams in parallel
      const [allUsers, allTeams] = await Promise.all([
        this.getAllUsers(),
        this.getAllTeams(),
      ]);

      // ── EMPLOYEE: restricted single-team view ─────────────────────────────
      if (role === Role.EMPLOYEE) {
        if (!currentUser.teamId) {
          return {
            success: true,
            message: 'Org chart (restricted view): employee has no assigned team',
            data: {
              scope: 'TEAM',
              team: null,
              members: [],
            },
          };
        }

        const ownTeam = allTeams.find((t) => t.teamId === currentUser.teamId) ?? null;
        const teamMembers = allUsers
          .filter((u) => u.teamId === currentUser.teamId)
          .map((u) => this.toPublicUser(u));

        return {
          success: true,
          message: 'Org chart (restricted view)',
          data: {
            scope: 'TEAM',
            team: ownTeam
              ? { teamId: ownTeam.teamId, name: ownTeam.name, description: ownTeam.description ?? null }
              : null,
            members: teamMembers,
          },
        };
      }

      // ── ADMIN / MANAGER: full org tree ────────────────────────────────────

      // Bucket users by role
      const admins = allUsers
        .filter((u) => u.role?.toUpperCase() === Role.ADMIN)
        .map((u) => this.toFullUser(u));

      const managers = allUsers
        .filter((u) => u.role?.toUpperCase() === Role.MANAGER)
        .map((u) => this.toFullUser(u));

      // Build a map of teamId → team metadata + members
      const teamMap = new Map<string, any>();
      for (const team of allTeams) {
        teamMap.set(team.teamId, {
          teamId: team.teamId,
          name: team.name,
          description: team.description ?? null,
          createdAt: team.createdAt,
          updatedAt: team.updatedAt,
          createdBy: team.createdBy ?? null,
          members: [],
        });
      }

      // Assign employees to their teams
      const unassigned: any[] = [];
      for (const user of allUsers) {
        const userRole = user.role?.toUpperCase();
        if (userRole !== Role.EMPLOYEE) continue;

        if (user.teamId && teamMap.has(user.teamId)) {
          teamMap.get(user.teamId).members.push(this.toFullUser(user));
        } else {
          unassigned.push(this.toFullUser(user));
        }
      }

      return {
        success: true,
        message: 'Org chart fetched successfully',
        data: {
          scope: 'ALL',
          summary: {
            totalAdmins: admins.length,
            totalManagers: managers.length,
            totalTeams: allTeams.length,
            totalEmployees: allUsers.filter((u) => u.role?.toUpperCase() === Role.EMPLOYEE).length,
          },
          admins,
          managers,
          teams: Array.from(teamMap.values()),
          unassignedEmployees: unassigned,
        },
      };
    } catch (error: unknown) {
      const { message, stack } = this.getErrorDetails(error);
      this.logger.error(`Error building org chart: ${message}`, stack);
      throw error;
    }
  }
}
