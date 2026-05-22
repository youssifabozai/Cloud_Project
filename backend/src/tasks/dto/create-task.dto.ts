import {
  IsIn,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { isValidImageKey } from '../tasks-image.util';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  description: string;

  @IsIn(['Low', 'Medium', 'High', 'Urgent'])
  priority: string;

  @IsISO8601()
  deadline: string;

  @IsString()
  @IsNotEmpty()
  assigneeId: string;

  @IsString()
  @IsNotEmpty()
  teamId: string;

  @IsOptional()
  @IsString()
  @ValidateIf((o) => o.imageKey != null && o.imageKey !== '')
  imageKey?: string;

  /** Optional display name stored on the task record */
  @IsOptional()
  @IsString()
  assigneeName?: string;

  static validateImageKey(imageKey?: string): void {
    if (imageKey != null && imageKey !== '' && !isValidImageKey(imageKey)) {
      throw new Error('imageKey must start with originals/');
    }
  }
}
