import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateTeamDto {
  @IsNotEmpty()
  @IsString()
  teamId: string;
}
