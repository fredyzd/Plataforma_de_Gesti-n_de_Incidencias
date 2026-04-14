import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(3000)
  body!: string;

  @IsOptional()
  @IsBoolean()
  is_internal?: boolean;
}
