import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import type { IncidentStatus } from '../incidents.types';

export class ChangeStatusDto {
  @IsIn([
    'open',
    'assigned',
    'in_progress',
    'awaiting_info',
    'awaiting_vendor',
    'resolved',
    'closed',
    'reopened',
  ])
  status!: IncidentStatus;

  @IsInt()
  @Min(1)
  expected_version!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}
