import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { SimpleJwksCache } from 'aws-jwt-verify/jwk';
import {
  CognitoIdentityProviderClient,
  GetUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { UsersService } from '../../users/users.service';

/** Default: 7 days — avoids Cognito JWKS / GetUser rate limits */
const AUTH_CACHE_TTL_MS =
  Number(process.env.AUTH_CACHE_TTL_MS) || 7 * 24 * 60 * 60 * 1000;

type CachedAuthContext = {
  expiresAt: number;
  user: Record<string, unknown>;
  username?: string;
};

@Injectable()
export class AuthenticationGuard implements CanActivate {
  private readonly region = process.env.AWS_REGION || 'us-east-1';

  private readonly verifier = CognitoJwtVerifier.create(
    {
      userPoolId: process.env.COGNITO_USER_POOL_ID!,
      tokenUse: 'access',
      clientId: process.env.COGNITO_CLIENT_ID!,
    },
    {
      // Reuse JWKS keys across requests (reduces Cognito .well-known/jwks.json calls)
      jwksCache: new SimpleJwksCache(),
    },
  );

  /** In-memory cache: one Cognito GetUser + DB resolve per user per week */
  private readonly userContextCache = new Map<string, CachedAuthContext>();

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
    const cookieToken = request.cookies ? request.cookies.accessToken : undefined;

    let token: string | undefined = undefined;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (cookieToken) {
      token = cookieToken;
    } else {
      throw new UnauthorizedException('Missing bearer token or accessToken cookie');
    }

    try {
      const payload = await this.verifier.verify(token!);
      const userId = payload.sub;

      const cached = this.getUserFromCache(userId);
      if (cached) {
        request.user = cached.user;
        return true;
      }

      let dbUser = await this.usersService.resolveUserForCognitoIdentity(
        userId,
      );

      let cognitoEmail: string | undefined;
      let cognitoUsername: string | undefined =
        typeof payload.username === 'string' ? payload.username : undefined;
      let attributes: Record<string, string | undefined> = {};

      if (!dbUser) {
        const userResponse = await this.cognitoClient.send(
          new GetUserCommand({
            AccessToken: token,
          }),
        );

        attributes = Object.fromEntries(
          (userResponse.UserAttributes ?? []).map((attr) => [
            attr.Name as string,
            attr.Value,
          ]),
        );

        cognitoEmail = attributes.email;
        cognitoUsername = userResponse.Username ?? cognitoUsername;

        dbUser = await this.usersService.resolveUserForCognitoIdentity(
          userId,
          cognitoEmail,
        );
      }

      let requestUser: Record<string, unknown>;

      if (!dbUser) {
        const cognitoRole = (attributes['custom:role'] ?? 'EMPLOYEE')
          .toString()
          .trim()
          .toUpperCase();
        requestUser = {
          userId,
          username: cognitoUsername,
          email: cognitoEmail,
          role: cognitoRole,
          teamId: attributes['custom:team'] || null,
        };
      } else {
        requestUser = this.usersService.toAuthenticatedUser(dbUser, userId);
        (requestUser as { username?: string }).username = cognitoUsername;
      }

      this.setUserCache(userId, requestUser);
      request.user = requestUser;
      return true;
    } catch (error: any) {
      const message = error?.message ?? 'Unknown error';
      this.logger.error('JWT AUTH ERROR:', message);
      if (/rate exceeded/i.test(message)) {
        throw new UnauthorizedException(
          'Cognito rate limit — wait a moment and retry, or log in again',
        );
      }
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private getUserFromCache(userId: string): CachedAuthContext | null {
    const entry = this.userContextCache.get(userId);
    if (!entry) {
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      this.userContextCache.delete(userId);
      return null;
    }
    return entry;
  }

  private setUserCache(userId: string, user: Record<string, unknown>): void {
    this.userContextCache.set(userId, {
      expiresAt: Date.now() + AUTH_CACHE_TTL_MS,
      user,
    });
  }
}