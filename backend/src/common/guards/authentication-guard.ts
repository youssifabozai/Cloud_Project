import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import {
  CognitoIdentityProviderClient,
  GetUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { UsersService } from '../../users/users.service';

@Injectable()
export class AuthenticationGuard implements CanActivate {
  private readonly region = process.env.AWS_REGION || 'us-east-1';

  private readonly verifier = CognitoJwtVerifier.create({
    userPoolId: process.env.COGNITO_USER_POOL_ID!,
    tokenUse: 'access',
    clientId: process.env.COGNITO_CLIENT_ID!,
  });

  private readonly cognitoClient = new CognitoIdentityProviderClient({
    region: this.region,
  });

  private readonly logger = new Logger(AuthenticationGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly usersService: UsersService,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization as string | undefined;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const token = authHeader.split(' ')[1];

    try {
      const payload = await this.verifier.verify(token);
      const userId = payload.sub;

      // Fetch full profile from DynamoDB (Source of Truth for Roles)
      let dbUser = await this.usersService.getUserById(userId);
      let cognitoEmail: string | undefined;

      if (!dbUser) {
        // Fallback to Cognito attributes so we can recover legacy users stored by email.
        const userResponse = await this.cognitoClient.send(
          new GetUserCommand({
            AccessToken: token,
          }),
        );

        const attributes = Object.fromEntries(
          (userResponse.UserAttributes ?? []).map((attr) => [
            attr.Name as string,
            attr.Value,
          ]),
        );

        cognitoEmail = attributes.email;
        if (cognitoEmail) {
          dbUser = await this.usersService.getUserByEmail(cognitoEmail);
        }

        if (!dbUser) {
          request.user = {
            userId: userId,
            username: userResponse.Username,
            email: cognitoEmail,
            role: 'EMPLOYEE', // Default for unknown DB users
            teamId: null,
          };
          return true;
        }
      }

      request.user = {
        userId: dbUser.userId,
        email: dbUser.email,
        role: String(dbUser.role || 'EMPLOYEE').trim().toUpperCase(),
        teamId: dbUser.teamId,
        fullName: dbUser.fullName,
      };

      return true;
    } catch (error: any) {
      this.logger.error('JWT AUTH ERROR:', error?.message);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}