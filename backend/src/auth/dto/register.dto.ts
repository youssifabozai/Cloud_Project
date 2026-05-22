import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';
import { Role } from '../../common/decorators/roles.decorator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsOptional()
  @IsIn([Role.EMPLOYEE, Role.MANAGER, Role.ADMIN])
  role?: Role;

  @ValidateIf((o) => (o.role ?? Role.EMPLOYEE) === Role.EMPLOYEE)
  @IsString()
  @IsNotEmpty()
  team?: string;
}
