import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import {
  CognitoIdentityProviderClient,
  AdminInitiateAuthCommand,
  GetUserCommand,
  AdminCreateUserCommand,
  AdminGetUserCommand,
  AdminDeleteUserCommand,
  AdminSetUserPasswordCommand,
  GlobalSignOutCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { createHmac } from 'crypto';
import { UsersService } from '../users/users.service';
import { Role } from '../common/decorators/roles.decorator';

type AuthTokens = {
  accessToken: string;
  idToken: string;
  refreshToken: string;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private cognitoClient: CognitoIdentityProviderClient;

  private readonly region = process.env.AWS_REGION || 'us-east-1';
  private readonly userPoolId = process.env.COGNITO_USER_POOL_ID!;
  private readonly clientId = process.env.COGNITO_CLIENT_ID!;
  private readonly clientSecret = process.env.COGNITO_CLIENT_SECRET!;

  // هاتيها من Cognito App Client > Show client secret
  // مهم: متبعتيش السر ده لأي حد


  constructor(private readonly usersService: UsersService) {
    this.cognitoClient = new CognitoIdentityProviderClient({
      region: this.region,
    });
  }

  private getSecretHash(username: string): string {
    return createHmac('sha256', this.clientSecret)
      .update(username + this.clientId)
      .digest('base64');
  }

  async signIn(email: string, password: string): Promise<AuthTokens> {
    try {
      const command = new AdminInitiateAuthCommand({
        AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
        UserPoolId: this.userPoolId,
        ClientId: this.clientId,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
          SECRET_HASH: this.getSecretHash(email),
        },
      });

      const response = await this.cognitoClient.send(command);
      const result = response.AuthenticationResult;

      if (!result?.AccessToken || !result?.IdToken || !result?.RefreshToken) {
        throw new UnauthorizedException('Login failed: tokens were not returned');
      }

      return {
        accessToken: result.AccessToken,
        idToken: result.IdToken,
        refreshToken: result.RefreshToken,
      };
    } catch (error) {
      this.logger.error('Cognito login error:', error);
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  async getUserInfo(accessToken: string) {
    try {
      const response = await this.cognitoClient.send(
        new GetUserCommand({
          AccessToken: accessToken,
        }),
      );

      const attributes = Object.fromEntries(
        (response.UserAttributes ?? []).map((attr) => [
          attr.Name,
          attr.Value,
        ]),
      );

      const userId = attributes.sub;
      const email = attributes.email;
      const fullName = attributes.name ?? null;
      let dbUser = await this.usersService.getUserById(userId);

      if (!dbUser && email) {
        dbUser = await this.usersService.getUserByEmail(email);
      }

      if (!dbUser) {
        dbUser = await this.usersService.createUser(userId, {
          email,
          fullName,
          role: (attributes['custom:role'] ?? 'EMPLOYEE').toUpperCase(),
          teamId: attributes['custom:team'] ?? null,
        });
      }

      if (dbUser) {
        const profileUpdates: Record<string, string> = {};
        if (email && dbUser.email !== email) {
          profileUpdates.email = email;
        }
        if (fullName && dbUser.fullName !== fullName) {
          profileUpdates.fullName = fullName;
        }

        if (Object.keys(profileUpdates).length > 0) {
          await this.usersService.updateUser(userId, profileUpdates);
          dbUser = { ...dbUser, ...profileUpdates };
        }
      }

      return {
        username: response.Username,
        sub: userId,
        email,
        emailVerified: attributes.email_verified === 'true',
        role: dbUser?.role ?? attributes['custom:role'] ?? 'EMPLOYEE',
        team: dbUser?.teamId ?? attributes['custom:team'] ?? null,
        fullName: dbUser?.fullName ?? fullName,
      };
    } catch (error) {
      this.logger.error('Cognito get user error:', error);
      throw new UnauthorizedException('Invalid token');
    }
  }
  async createUser(data: {
    email: string;
    password: string;
    fullName: string;
    role: Role;
    team: string;
  }) {
    try {
      await this.cognitoClient.send(
        new AdminCreateUserCommand({
          UserPoolId: this.userPoolId,
          Username: data.email,
          MessageAction: 'SUPPRESS',
          UserAttributes: [
            { Name: 'email', Value: data.email },
            { Name: 'email_verified', Value: 'true' },
            { Name: 'name', Value: data.fullName },
          ],
          TemporaryPassword: data.password,
        }),
      );

      const createdUser = await this.cognitoClient.send(
        new AdminGetUserCommand({
          UserPoolId: this.userPoolId,
          Username: data.email,
        }),
      );

      await this.cognitoClient.send(
        new AdminSetUserPasswordCommand({
          UserPoolId: this.userPoolId,
          Username: data.email,
          Password: data.password,
          Permanent: true,
        }),
      );
      const userId = createdUser.UserAttributes?.find((attr) => attr.Name === 'sub')?.Value ?? data.email;

      let userProfile;
      try {
        userProfile = await this.usersService.createUser(userId, {
          email: data.email,
          fullName: data.fullName,
          role: data.role,
          teamId: data.team,
        });
      } catch (dbError) {
        await this.cognitoClient.send(
          new AdminDeleteUserCommand({
            UserPoolId: this.userPoolId,
            Username: data.email,
          }),
        ).catch(() => undefined);
        throw dbError;
      }

      return {
        userId,
        email: data.email,
        fullName: data.fullName,
        role: data.role,
        teamId: data.team,
        dynamoDbProfile: userProfile,
      };
    } catch (error: any) {
      const errorName = error?.name ?? error?.__type;
      if (errorName === 'InvalidPasswordException') {
        throw new BadRequestException(
          'Password does not meet Cognito policy requirements. Use a stronger password.',
        );
      }

      this.logger.error(`Error creating user in Cognito: ${error.message}`, error.stack);
      throw error;
    }
  }

  async registerPublicUser(data: {
    email: string;
    password: string;
    fullName: string;
    team?: string;
  }) {
    return this.createUser({
      email: data.email,
      password: data.password,
      fullName: data.fullName,
      role: Role.EMPLOYEE,
      team: data.team ?? '',
    });
  }

  async logout(accessToken: string) {
    try {
      const command = new GlobalSignOutCommand({
        AccessToken: accessToken,
      });

      await this.cognitoClient.send(command);

      return {
        success: true,
        message: 'User signed out globally from all devices',
      };
    } catch (error) {
      this.logger.error('Cognito logout error:', error);
      throw new UnauthorizedException('Logout failed');
    }
  }
}