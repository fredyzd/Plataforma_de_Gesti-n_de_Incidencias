import { IsString, MinLength } from 'class-validator';

export class ChangeInitialPasswordDto {
  @IsString()
  temp_token!: string;

  @IsString()
  @MinLength(10)
  new_password!: string;
}
