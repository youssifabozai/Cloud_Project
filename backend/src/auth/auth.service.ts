import { Injectable, UnauthorizedException } from '@nestjs/common';
import {
  CognitoIdentityProviderClient,
  AdminInitiateAuthCommand,
  GetUserCommand,
   AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminUpdateUserAttributesCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { createHmac } from 'crypto';
import { UsersService } from '../users/users.service';

type AuthTokens = {
  accessToken: string;
  idToken: string;
  refreshToken: string;
};

@Injectable()
export class AuthService {
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
      console.error('Cognito login error:', error);
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

      return {
        username: response.Username,
        sub: attributes.sub,
        email: attributes.email,
        emailVerified: attributes.email_verified === 'true',
        role: attributes['custom:role'] ?? null,
        team: attributes['custom:team'] ?? null,
      };
    } catch (error) {
      console.error('Cognito get user error:', error);
      throw new UnauthorizedException('Invalid token');
    }
  }
  async createUser(data: {
  email: string;
  password: string;
  fullName: string;
  role: 'Manager' | 'Employee' | 'Admin';
  team: string;
}) {
  try {
    const createResponse = await this.cognitoClient.send(
      new AdminCreateUserCommand({
        UserPoolId: this.userPoolId,
        Username: data.email,
        MessageAction: 'SUPPRESS',
        UserAttributes: [
          { Name: 'email', Value: data.email },
          { Name: 'email_verified', Value: 'true' },
          { Name: 'custom:role', Value: data.role },
          { Name: 'custom:team', Value: data.team },
          { Name: 'name', Value: data.fullName },
        ],
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

    await this.cognitoClient.send(
      new AdminUpdateUserAttributesCommand({
        UserPoolId: this.userPoolId,
        Username: data.email,
        UserAttributes: [
          { Name: 'email_verified', Value: 'true' },
          { Name: 'custom:role', Value: data.role },
          { Name: 'custom:team', Value: data.team },
          { Name: 'name', Value: data.fullName },
        ],
      }),
    );

    const userId =
  createResponse.User?.Attributes?.find((attr) => attr.Name === 'sub')
    ?.Value ?? data.email;

const userProfile = await this.usersService.createUser(userId, {
  email: data.email,
  fullName: data.fullName,
  role: data.role,
  teamId: data.team,
});

return {
  userId,
  email: data.email,
  fullName: data.fullName,
  role: data.role,
  teamId: data.team,
  dynamoDbProfile: userProfile,
};
  } catch (error: any) {
    console.error('COGNITO CREATE USER ERROR:', {
      name: error?.name,
      message: error?.message,
    });

    throw error;
  }
}
}