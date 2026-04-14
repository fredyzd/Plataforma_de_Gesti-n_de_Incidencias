import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { IncidentPriority } from '../incidents.types';

export class CreateIncidentDto {
  @IsString()
  @MinLength(5)
  @MaxLength(140)
  title!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  description!: string;

  @IsIn(['critical', 'high', 'medium', 'low'])
  priority!: IncidentPriority;

  @IsOptional()
  @IsString()
  system_id?: string;
}
