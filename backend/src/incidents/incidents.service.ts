import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import type {
  AuthzUser,
  IncidentCommentRecord,
  IncidentPriority,
  IncidentRecord,
  IncidentStatus,
  TrackingEventRecord,
} from './incidents.types';
import type { CreateIncidentDto } from './dto/create-incident.dto';
import type { UpdateIncidentDto } from './dto/update-incident.dto';
import type { AssignIncidentDto } from './dto/assign-incident.dto';
import type { ChangeStatusDto } from './dto/change-status.dto';
import type { CreateCommentDto } from './dto/create-comment.dto';
import type { ListIncidentsDto } from './dto/list-incidents.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { EventsGateway } from '../events/events.gateway';

const AGENT_ROLES = new Set(['agent', 'supervisor', 'admin']);
const SLA_HOURS: Record<IncidentPriority, number> = {
  critical: 4,
  high: 8,
  medium: 24,
  low: 72,
};
const TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  open: ['assigned', 'in_progress', 'closed'],
  assigned: [
    'in_progress',
    'awaiting_info',
    'awaiting_vendor',
    'resolved',
    'closed',
  ],
  in_progress: ['awaiting_info', 'awaiting_vendor', 'resolved', 'closed'],
  awaiting_info: ['in_progress', 'resolved', 'closed'],
  awaiting_vendor: ['in_progress', 'resolved', 'closed'],
  resolved: ['closed', 'reopened'],
  closed: ['reopened'],
  reopened: ['assigned', 'in_progress', 'resolved', 'closed'],
};

@Injectable()
export class IncidentsService {
  private readonly incidents = new Map<string, IncidentRecord>();
  private readonly trackingEvents = new Map<string, TrackingEventRecord[]>();
  private readonly comments = new Map<string, IncidentCommentRecord[]>();
  private sequence = 1;

  constructor(
    private readonly notifications: NotificationsService,
    private readonly events: EventsGateway,
  ) {}

  private nowIso() {
    return new Date().toISOString();
  }

  private slaDeadline(priority: IncidentPriority, fromIso: string): string {
    const from = new Date(fromIso);
    from.setHours(from.getHours() + SLA_HOURS[priority]);
    return from.toISOString();
  }

  private isSlaBreached(incident: IncidentRecord): boolean {
    const deadline = new Date(incident.slaDeadlineAt);
    const finishedAt = incident.resolvedAt ?? incident.closedAt;
    if (finishedAt) {
      return new Date(finishedAt) > deadline;
    }
    return new Date() > deadline;
  }

  // Expone todos los incidents para el módulo de reportes
  getAllIncidents(): IncidentRecord[] {
    return Array.from(this.incidents.values());
  }

  private assertAgentRole(user: AuthzUser) {
    if (!AGENT_ROLES.has(user.role)) {
      throw new ForbiddenException('No tienes permisos para esta acción');
    }
  }

  private canAccessIncident(user: AuthzUser, incident: IncidentRecord) {
    if (AGENT_ROLES.has(user.role)) {
      return true;
    }
    return incident.reporterId === user.id;
  }

  private getOrFailIncident(incidentId: string) {
    const incident = this.incidents.get(incidentId);
    if (!incident) {
      throw new NotFoundException('Incidencia no encontrada');
    }
    return incident;
  }

  private nextTicketNumber() {
    const year = new Date().getFullYear();
    const padded = String(this.sequence).padStart(6, '0');
    this.sequence += 1;
    return `PGI-${year}-${padded}`;
  }

  private pushTracking(
    incidentId: string,
    actorId: string,
    event: TrackingEventRecord['eventType'],
    options?: {
      comment?: string | null;
      fieldChanged?: string | null;
      oldValue?: string | null;
      newValue?: string | null;
    },
  ) {
    const eventRecord: TrackingEventRecord = {
      id: randomUUID(),
      incidentId,
      actorId,
      eventType: event,
      comment: options?.comment ?? null,
      fieldChanged: options?.fieldChanged ?? null,
      oldValue: options?.oldValue ?? null,
      newValue: options?.newValue ?? null,
      createdAt: this.nowIso(),
    };

    const list = this.trackingEvents.get(incidentId) ?? [];
    list.push(eventRecord);
    this.trackingEvents.set(incidentId, list);
  }

  private assertVersion(incident: IncidentRecord, expected: number) {
    if (incident.version !== expected) {
      throw new ConflictException({
        message: 'Conflicto de concurrencia: la incidencia cambió',
        current_version: incident.version,
        expected_version: expected,
      });
    }
  }

  createIncident(user: AuthzUser, dto: CreateIncidentDto) {
    const now = this.nowIso();
    const incident: IncidentRecord = {
      id: randomUUID(),
      ticketNumber: this.nextTicketNumber(),
      title: dto.title.trim(),
      description: dto.description.trim(),
      priority: dto.priority,
      status: 'open',
      reporterId: user.id,
      reporterEmail: user.email,
      assigneeId: null,
      version: 1,
      createdAt: now,
      updatedAt: now,
      resolvedAt: null,
      closedAt: null,
      slaDeadlineAt: this.slaDeadline(dto.priority, now),
      slaBreached: false,
    };

    this.incidents.set(incident.id, incident);
    this.pushTracking(incident.id, user.id, 'created');

    this.events.broadcastIncidentUpdate({
      type: 'incident.created',
      incidentId: incident.id,
      ticketNumber: incident.ticketNumber,
      payload: { status: incident.status, priority: incident.priority },
      actorEmail: user.email,
      timestamp: now,
    });

    this.notifications.notifyIncidentCreated({
      reporterEmail: user.email,
      ticketNumber: incident.ticketNumber,
      title: incident.title,
      priority: incident.priority,
    });

    return incident;
  }

  listIncidents(user: AuthzUser, filters: ListIncidentsDto) {
    const all = Array.from(this.incidents.values());
    return all.filter((incident) => {
      if (!this.canAccessIncident(user, incident)) {
        return false;
      }
      if (filters.status && incident.status !== filters.status) {
        return false;
      }
      if (filters.priority && incident.priority !== filters.priority) {
        return false;
      }
      return true;
    });
  }

  getIncidentById(user: AuthzUser, incidentId: string) {
    const incident = this.getOrFailIncident(incidentId);
    if (!this.canAccessIncident(user, incident)) {
      throw new ForbiddenException(
        'No tienes permisos para ver esta incidencia',
      );
    }
    return incident;
  }

  updateIncident(user: AuthzUser, incidentId: string, dto: UpdateIncidentDto) {
    const incident = this.getOrFailIncident(incidentId);
    if (!this.canAccessIncident(user, incident)) {
      throw new ForbiddenException(
        'No tienes permisos para editar esta incidencia',
      );
    }
    this.assertVersion(incident, dto.expected_version);

    const updates: Array<[string, string | null, string | null]> = [];
    if (dto.title && dto.title.trim() !== incident.title) {
      updates.push(['title', incident.title, dto.title.trim()]);
      incident.title = dto.title.trim();
    }
    if (dto.description && dto.description.trim() !== incident.description) {
      updates.push([
        'description',
        incident.description,
        dto.description.trim(),
      ]);
      incident.description = dto.description.trim();
    }
    if (dto.priority && dto.priority !== incident.priority) {
      updates.push(['priority', incident.priority, dto.priority]);
      incident.priority = dto.priority;
      this.pushTracking(incident.id, user.id, 'priority_changed', {
        fieldChanged: 'priority',
        oldValue: updates.at(-1)?.[1] ?? null,
        newValue: updates.at(-1)?.[2] ?? null,
      });
    }

    if (updates.length === 0) {
      return incident;
    }

    incident.version += 1;
    incident.updatedAt = this.nowIso();
    for (const [field, oldValue, newValue] of updates) {
      this.pushTracking(incident.id, user.id, 'field_updated', {
        fieldChanged: field,
        oldValue,
        newValue,
      });
    }

    return incident;
  }

  assignIncident(user: AuthzUser, incidentId: string, dto: AssignIncidentDto) {
    this.assertAgentRole(user);
    const incident = this.getOrFailIncident(incidentId);
    this.assertVersion(incident, dto.expected_version);

    const oldAssignee = incident.assigneeId;
    incident.assigneeId = dto.assignee_id;
    if (incident.status === 'open') {
      incident.status = 'assigned';
    }
    incident.version += 1;
    incident.updatedAt = this.nowIso();
    this.pushTracking(incident.id, user.id, 'assigned', {
      fieldChanged: 'assigneeId',
      oldValue: oldAssignee,
      newValue: dto.assignee_id,
    });

    this.events.broadcastIncidentUpdate({
      type: 'incident.assigned',
      incidentId: incident.id,
      ticketNumber: incident.ticketNumber,
      payload: { assigneeId: dto.assignee_id, status: incident.status },
      actorEmail: user.email,
      timestamp: incident.updatedAt,
    });

    // Notificar al agente asignado si es diferente al actor
    if (dto.assignee_id !== user.id) {
      this.notifications.notifyIncidentAssigned({
        assigneeEmail: dto.assignee_id, // Temporal: en prod se resuelve por userId
        ticketNumber: incident.ticketNumber,
        title: incident.title,
        assignedByEmail: user.email,
      });
    }

    return incident;
  }

  changeStatus(user: AuthzUser, incidentId: string, dto: ChangeStatusDto) {
    this.assertAgentRole(user);
    const incident = this.getOrFailIncident(incidentId);
    this.assertVersion(incident, dto.expected_version);

    if (incident.status === dto.status) {
      return incident;
    }

    const allowed = TRANSITIONS[incident.status] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Transición no permitida: ${incident.status} -> ${dto.status}`,
      );
    }

    if (dto.status === 'resolved' && !dto.comment) {
      throw new BadRequestException('Para resolver se requiere comentario');
    }
    if (dto.status === 'reopened' && !dto.comment) {
      throw new BadRequestException('Para reabrir se requiere comentario');
    }

    const previous = incident.status;
    incident.status = dto.status;
    incident.version += 1;
    incident.updatedAt = this.nowIso();
    if (dto.status === 'resolved') {
      incident.resolvedAt = this.nowIso();
      incident.slaBreached = this.isSlaBreached(incident);
    }
    if (dto.status === 'closed') {
      incident.closedAt = this.nowIso();
      if (!incident.resolvedAt) {
        incident.slaBreached = this.isSlaBreached(incident);
      }
    }

    this.pushTracking(incident.id, user.id, 'status_changed', {
      fieldChanged: 'status',
      oldValue: previous,
      newValue: dto.status,
      comment: dto.comment,
    });

    if (dto.status === 'resolved') {
      this.pushTracking(incident.id, user.id, 'resolved', {
        comment: dto.comment ?? null,
      });
    }
    if (dto.status === 'closed') {
      this.pushTracking(incident.id, user.id, 'closed', {
        comment: dto.comment ?? null,
      });
    }
    if (dto.status === 'reopened') {
      this.pushTracking(incident.id, user.id, 'reopened', {
        comment: dto.comment ?? null,
      });
    }

    this.events.emitToIncident(incident.id, {
      type: 'incident.status_changed',
      incidentId: incident.id,
      ticketNumber: incident.ticketNumber,
      payload: {
        oldStatus: previous,
        newStatus: dto.status,
        comment: dto.comment ?? null,
      },
      actorEmail: user.email,
      timestamp: incident.updatedAt,
    });
    this.events.broadcastIncidentUpdate({
      type: 'incident.status_changed',
      incidentId: incident.id,
      ticketNumber: incident.ticketNumber,
      payload: { status: incident.status, priority: incident.priority },
      actorEmail: user.email,
      timestamp: incident.updatedAt,
    });

    // Notificar al reporter sobre el cambio de estado
    if (incident.reporterEmail && incident.reporterId !== user.id) {
      this.notifications.notifyStatusChanged({
        reporterEmail: incident.reporterEmail,
        ticketNumber: incident.ticketNumber,
        title: incident.title,
        oldStatus: previous,
        newStatus: dto.status,
        comment: dto.comment ?? null,
      });
    }

    return incident;
  }

  getTracking(user: AuthzUser, incidentId: string) {
    const incident = this.getOrFailIncident(incidentId);
    if (!this.canAccessIncident(user, incident)) {
      throw new ForbiddenException(
        'No tienes permisos para ver esta incidencia',
      );
    }
    return this.trackingEvents.get(incidentId) ?? [];
  }

  listComments(user: AuthzUser, incidentId: string) {
    const incident = this.getOrFailIncident(incidentId);
    if (!this.canAccessIncident(user, incident)) {
      throw new ForbiddenException(
        'No tienes permisos para ver esta incidencia',
      );
    }
    const comments = this.comments.get(incidentId) ?? [];
    if (AGENT_ROLES.has(user.role)) {
      return comments;
    }
    return comments.filter((item) => !item.isInternal);
  }

  addComment(user: AuthzUser, incidentId: string, dto: CreateCommentDto) {
    const incident = this.getOrFailIncident(incidentId);
    if (!this.canAccessIncident(user, incident)) {
      throw new ForbiddenException('No tienes permisos para comentar');
    }

    const isInternal = dto.is_internal ?? false;
    if (isInternal && !AGENT_ROLES.has(user.role)) {
      throw new ForbiddenException(
        'Solo agentes pueden crear comentarios internos',
      );
    }

    const comment: IncidentCommentRecord = {
      id: randomUUID(),
      incidentId,
      authorId: user.id,
      body: dto.body.trim(),
      isInternal,
      createdAt: this.nowIso(),
    };

    const list = this.comments.get(incidentId) ?? [];
    list.push(comment);
    this.comments.set(incidentId, list);
    this.pushTracking(incidentId, user.id, 'comment_added', {
      comment: isInternal ? '[Comentario interno]' : dto.body,
    });

    this.events.emitToIncident(incidentId, {
      type: 'incident.comment_added',
      incidentId,
      ticketNumber: incident.ticketNumber,
      payload: { commentId: comment.id, isInternal, authorEmail: user.email },
      actorEmail: user.email,
      timestamp: comment.createdAt,
    });

    // Notificar comentario público al reporter si el autor es agente
    if (!isInternal && AGENT_ROLES.has(user.role) && incident.reporterEmail) {
      this.notifications.notifyCommentAdded({
        recipientEmail: incident.reporterEmail,
        ticketNumber: incident.ticketNumber,
        title: incident.title,
        authorEmail: user.email,
        commentBody: dto.body.trim(),
      });
    }

    return comment;
  }
}
