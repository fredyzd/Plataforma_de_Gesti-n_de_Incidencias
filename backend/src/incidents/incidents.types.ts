import type { Role } from '../auth/auth.types';

export type IncidentPriority = 'critical' | 'high' | 'medium' | 'low';
export type IncidentStatus =
  | 'open'
  | 'assigned'
  | 'in_progress'
  | 'awaiting_info'
  | 'awaiting_vendor'
  | 'resolved'
  | 'closed'
  | 'reopened';

export interface IncidentRecord {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  priority: IncidentPriority;
  status: IncidentStatus;
  reporterId: string;
  reporterEmail: string;
  assigneeId: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  closedAt: string | null;
  slaDeadlineAt: string; // ISO — calculado al crear según prioridad
  slaBreached: boolean; // true si resolvedAt > slaDeadlineAt o sigue abierta past deadline
}

export interface TrackingEventRecord {
  id: string;
  incidentId: string;
  actorId: string;
  eventType:
    | 'created'
    | 'assigned'
    | 'status_changed'
    | 'priority_changed'
    | 'comment_added'
    | 'resolved'
    | 'closed'
    | 'reopened'
    | 'field_updated';
  comment: string | null;
  fieldChanged: string | null;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
}

export interface IncidentCommentRecord {
  id: string;
  incidentId: string;
  authorId: string;
  body: string;
  isInternal: boolean;
  createdAt: string;
}

export interface AuthzUser {
  id: string;
  role: Role;
  email: string;
}
