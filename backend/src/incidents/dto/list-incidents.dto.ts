import { IsIn, IsOptional } from 'class-validator';
import type { IncidentPriority, IncidentStatus } from '../incidents.types';

export class ListIncidentsDto {
  @IsOptional()
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
  status?: IncidentStatus;

  @IsOptional()
  @IsIn(['critical', 'high', 'medium', 'low'])
  priority?: IncidentPriority;
}
