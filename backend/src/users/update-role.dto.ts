import { IsEnum, IsNotEmpty } from 'class-validator';

export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  EMPLOYEE = 'EMPLOYEE',
}

export class UpdateRoleDto {
  @IsNotEmpty()
  @IsEnum(UserRole, {
    message: 'role must be one of: ADMIN, MANAGER, EMPLOYEE',
  })
  role!: UserRole;
}