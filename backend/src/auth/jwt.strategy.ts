import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    const userPoolId = configService.get<string>('COGNITO_USER_POOL_ID');
    const region = configService.get<string>('AWS_REGION');
    const authority = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;

    super({
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${authority}/.well-known/jwks.json`,
      }),
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      audience: configService.get<string>('COGNITO_CLIENT_ID'),
      issuer: authority,
      algorithms: ['RS256'],
    });
  }

  public async validate(payload: any) {
    // The payload from Cognito JWT token.
    // Ensure that teamId and role are available if mapped in Cognito.
    return {
      userId: payload.sub,
      username: payload.username,
      role: payload['custom:role'],
      teamId: payload['custom:teamId'],
    };
  }
}
