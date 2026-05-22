import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Post,
  Headers,
  Res,
  Req,
  Get,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { Public } from '../common/decorators/public.decorator';
import { UsersService } from '../users/users.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/decorators/roles.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Public()
  @Post('login')
  async login(
    @Body() body: { email: string; password: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!body?.email || !body?.password) {
      throw new BadRequestException('Email and password are required');
    }

    const tokens = await this.authService.signIn(body.email, body.password);
    const userInfo = await this.authService.getUserInfo(tokens.accessToken);

    // Set HttpOnly cookies for access and refresh tokens
    const isProd = process.env.NODE_ENV === 'production';
    const accessMaxAge = 60 * 60 * 1000; // 1 hour
    const refreshMaxAge = 30 * 24 * 60 * 60 * 1000; // 30 days

    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'lax' : 'lax',
      maxAge: accessMaxAge,
    });

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'lax' : 'lax',
      maxAge: refreshMaxAge,
    });

    return {
      user: userInfo,
    };
  }

  @Public()
  @Post('register')
  async register(
    @Body()
    body: {
      email: string;
      password: string;
      fullName: string;
      team?: string;
    },
  ) {
    if (!body?.email || !body?.password || !body?.fullName) {
      throw new BadRequestException('email, password, and fullName are required');
    }

    const createdUser = await this.authService.registerPublicUser(body);

    return {
      success: true,
      message: 'User registered successfully',
      data: createdUser,
    };
  }

  @Post('create-user')
  async createUser(
    @CurrentUser() user: any,
    @Body()
    body: {
      email: string;
      password: string;
      fullName: string;
      role: Role;
      team: string;
    },
  ) {
    const currentRole = user?.role?.toUpperCase();

    if (currentRole !== 'MANAGER' && currentRole !== 'ADMIN') {
      throw new ForbiddenException('Only Manager/Admin can create users');
    }

    if (!body?.email || !body?.password || !body?.fullName || !body?.role || !body?.team) {
      throw new BadRequestException(
        'email, password, fullName, role, and team are required',
      );
    }

    const createdUser = await this.authService.createUser(body);

    return {
      success: true,
      message: 'User created in Cognito successfully',
      data: createdUser,
    };
  }

  @Post('logout')
  async logout(
    @CurrentUser() user: any,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Try to read access token from cookie, fallback to Authorization header
    const cookieToken = (req as any).cookies?.accessToken as string | undefined;
    const authHeader = req.headers.authorization as string | undefined;
    const token = cookieToken || (authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined);

    // Clear cookies regardless
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    if (!token) {
      return { success: true, message: 'Logged out (no token to revoke)' };
    }

    return this.authService.logout(token);
  }

  @Get('me')
  async me(@Req() req: Request) {
    const cookieToken = (req as any).cookies?.accessToken as string | undefined;
    if (!cookieToken) {
      throw new BadRequestException('No access token found in cookies');
    }
    const userInfo = await this.authService.getUserInfo(cookieToken);
    return { user: userInfo };
  }
}