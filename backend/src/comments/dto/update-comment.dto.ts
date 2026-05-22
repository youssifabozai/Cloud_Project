import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class UpdateCommentDto {
  @IsUUID()
  taskId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  text: string;
}
