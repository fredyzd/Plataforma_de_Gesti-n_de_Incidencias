import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import type { IncidentPriority } from '../incidents.types';

export class UpdateIncidentDto {
  @IsInt()
  @Min(1)
  expected_version!: number;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @IsIn(['critical', 'high', 'medium', 'low'])
  priority?: IncidentPriority;
}
