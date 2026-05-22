import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(private reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true; // No roles required, allow access
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user || !user.role) {
      throw new ForbiddenException('Access Denied: No role found on user.');
    }

    const userRole = String(user.role).trim().toUpperCase();
    const hasRole = requiredRoles.some((role) => String(role).trim().toUpperCase() === userRole);
    if (!hasRole) {
      throw new ForbiddenException(`Access Denied: Requires one of [${requiredRoles.join(', ')}] roles.`);
    }

    return true;
  }
}
