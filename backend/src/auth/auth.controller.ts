import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Post,
  Headers,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from '../common/decorators/public.decorator';
import { UsersService } from '../users/users.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/decorators/roles.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    if (!body?.email || !body?.password) {
      throw new BadRequestException('Email and password are required');
    }

    const tokens = await this.authService.signIn(body.email, body.password);
    const userInfo = await this.authService.getUserInfo(tokens.accessToken);

    return {
      ...tokens,
      user: userInfo,
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
  async logout(@CurrentUser() user: any, @Headers('authorization') authHeader: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new BadRequestException('Bearer token is required for logout');
    }

    const token = authHeader.split(' ')[1];
    return this.authService.logout(token);
  }
}