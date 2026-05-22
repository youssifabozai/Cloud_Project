import { IsString, IsNotEmpty, IsOptional, IsDateString, IsEnum, IsArray } from 'class-validator';

export enum ProjectStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
}

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(ProjectStatus)
  @IsOptional()
  status?: ProjectStatus;

  @IsDateString()
  @IsOptional()
  deadline?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  assignedUserIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  assignedTeamIds?: string[];
}
