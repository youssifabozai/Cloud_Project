import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateCommentDto {
  @IsUUID()
  taskId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  text: string;
}
