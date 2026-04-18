import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
import { DatabaseService } from '../database/database.service';

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

interface IncidentRow {
  id: string;
  ticket_number: string;
  title: string;
  description: string;
  priority: IncidentPriority;
  status: IncidentStatus;
  reporter_id: string;
  reporter_email: string;
  assignee_id: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  closed_at: string | null;
  sla_deadline: string;
  sla_breached: boolean;
}

interface TrackingRow {
  id: string;
  incident_id: string;
  actor_id: string;
  event_type: TrackingEventRecord['eventType'];
  comment: string | null;
  field_changed: string | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

interface CommentRow {
  id: string;
  incident_id: string;
  author_id: string;
  body: string;
  is_internal: boolean;
  created_at: string;
}

@Injectable()
export class IncidentsService {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly events: EventsGateway,
    private readonly db: DatabaseService,
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

  private toIncidentRecord(row: IncidentRow): IncidentRecord {
    return {
      id: row.id,
      ticketNumber: row.ticket_number,
      title: row.title,
      description: row.description,
      priority: row.priority,
      status: row.status,
      reporterId: row.reporter_id,
      reporterEmail: row.reporter_email,
      assigneeId: row.assignee_id,
      version: row.version,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      resolvedAt: row.resolved_at,
      closedAt: row.closed_at,
      slaDeadlineAt: row.sla_deadline,
      slaBreached: row.sla_breached,
    };
  }

  private toTrackingRecord(row: TrackingRow): TrackingEventRecord {
    return {
      id: row.id,
      incidentId: row.incident_id,
      actorId: row.actor_id,
      eventType: row.event_type,
      comment: row.comment,
      fieldChanged: row.field_changed,
      oldValue: row.old_value,
      newValue: row.new_value,
      createdAt: row.created_at,
    };
  }

  private toCommentRecord(row: CommentRow): IncidentCommentRecord {
    return {
      id: row.id,
      incidentId: row.incident_id,
      authorId: row.author_id,
      body: row.body,
      isInternal: row.is_internal,
      createdAt: row.created_at,
    };
  }

  private assertAgentRole(user: AuthzUser) {
    if (!AGENT_ROLES.has(user.role)) {
      throw new ForbiddenException('No tienes permisos para esta accion');
    }
  }

  private canAccessIncident(user: AuthzUser, incident: IncidentRecord) {
    if (AGENT_ROLES.has(user.role)) {
      return true;
    }
    return incident.reporterId === user.id;
  }

  private async getOrFailIncident(incidentId: string): Promise<IncidentRecord> {
    const { rows } = await this.db.query<IncidentRow>(
      `
        SELECT i.id,
               i.ticket_number,
               i.title,
               i.description,
               i.priority,
               i.status,
               i.reporter_id,
               u.email AS reporter_email,
               i.assignee_id,
               i.version,
               i.created_at,
               i.updated_at,
               i.resolved_at,
               i.closed_at,
               i.sla_deadline,
               i.sla_breached
        FROM incidents i
        JOIN users u ON u.id = i.reporter_id
        WHERE i.id = $1
      `,
      [incidentId],
    );

    const row = rows[0];
    if (!row) {
      throw new NotFoundException('Incidencia no encontrada');
    }

    return this.toIncidentRecord(row);
  }

  private async pushTracking(
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
    await this.db.query(
      `
        INSERT INTO tracking_events (
          incident_id,
          actor_id,
          event_type,
          field_changed,
          old_value,
          new_value,
          comment,
          metadata
        )
        VALUES ($1, $2, $3::tracking_event_type, $4, $5, $6, $7, '{}'::jsonb)
      `,
      [
        incidentId,
        actorId,
        event,
        options?.fieldChanged ?? null,
        options?.oldValue ?? null,
        options?.newValue ?? null,
        options?.comment ?? null,
      ],
    );
  }

  private assertVersion(incident: IncidentRecord, expected: number) {
    if (incident.version !== expected) {
      throw new ConflictException({
        message: 'Conflicto de concurrencia: la incidencia cambio',
        current_version: incident.version,
        expected_version: expected,
      });
    }
  }

  private async getDefaultSystemId(): Promise<string> {
    const { rows } = await this.db.query<{ id: string }>(
      `
        SELECT id
        FROM systems
        WHERE active = true
        ORDER BY created_at ASC
        LIMIT 1
      `,
    );

    if (rows[0]) {
      return rows[0].id;
    }

    const inserted = await this.db.query<{ id: string }>(
      `
        INSERT INTO systems (name, description, category, criticality, active)
        VALUES ('Sistema General', 'Sistema creado automaticamente', 'General', 'medium', true)
        RETURNING id
      `,
    );

    return inserted.rows[0].id;
  }

  async getAllIncidents(): Promise<IncidentRecord[]> {
    const { rows } = await this.db.query<IncidentRow>(
      `
        SELECT i.id,
               i.ticket_number,
               i.title,
               i.description,
               i.priority,
               i.status,
               i.reporter_id,
               u.email AS reporter_email,
               i.assignee_id,
               i.version,
               i.created_at,
               i.updated_at,
               i.resolved_at,
               i.closed_at,
               i.sla_deadline,
               i.sla_breached
        FROM incidents i
        JOIN users u ON u.id = i.reporter_id
        ORDER BY i.created_at DESC
      `,
    );

    return rows.map((row) => this.toIncidentRecord(row));
  }

  async createIncident(user: AuthzUser, dto: CreateIncidentDto) {
    const now = this.nowIso();
    const slaDeadline = this.slaDeadline(dto.priority, now);
    const systemId = dto.system_id ?? (await this.getDefaultSystemId());

    const { rows } = await this.db.query<IncidentRow>(
      `
        INSERT INTO incidents (
          ticket_number,
          title,
          description,
          priority,
          status,
          system_id,
          reporter_id,
          assignee_id,
          version,
          sla_deadline,
          sla_breached,
          created_at,
          updated_at
        )
        VALUES (
          NULL,
          $1,
          $2,
          $3::incident_priority,
          'open'::incident_status,
          $4,
          $5,
          NULL,
          1,
          $6,
          false,
          NOW(),
          NOW()
        )
        RETURNING id,
                  ticket_number,
                  title,
                  description,
                  priority,
                  status,
                  reporter_id,
                  assignee_id,
                  version,
                  created_at,
                  updated_at,
                  resolved_at,
                  closed_at,
                  sla_deadline,
                  sla_breached
      `,
      [dto.title.trim(), dto.description.trim(), dto.priority, systemId, user.id, slaDeadline],
    );

    const incidentRaw = rows[0];
    const incident: IncidentRecord = {
      ...this.toIncidentRecord({
        ...incidentRaw,
        reporter_email: user.email,
      }),
      reporterEmail: user.email,
    };

    await this.pushTracking(incident.id, user.id, 'created');

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

  async listIncidents(user: AuthzUser, filters: ListIncidentsDto) {
    const params: unknown[] = [];
    let where = 'WHERE 1=1';

    if (!AGENT_ROLES.has(user.role)) {
      params.push(user.id);
      where += ` AND i.reporter_id = $${params.length}`;
    }

    if (filters.status) {
      params.push(filters.status);
      where += ` AND i.status = $${params.length}::incident_status`;
    }

    if (filters.priority) {
      params.push(filters.priority);
      where += ` AND i.priority = $${params.length}::incident_priority`;
    }

    const { rows } = await this.db.query<IncidentRow>(
      `
        SELECT i.id,
               i.ticket_number,
               i.title,
               i.description,
               i.priority,
               i.status,
               i.reporter_id,
               u.email AS reporter_email,
               i.assignee_id,
               i.version,
               i.created_at,
               i.updated_at,
               i.resolved_at,
               i.closed_at,
               i.sla_deadline,
               i.sla_breached
        FROM incidents i
        JOIN users u ON u.id = i.reporter_id
        ${where}
        ORDER BY i.created_at DESC
      `,
      params,
    );

    return rows.map((row) => this.toIncidentRecord(row));
  }

  async getIncidentById(user: AuthzUser, incidentId: string) {
    const incident = await this.getOrFailIncident(incidentId);
    if (!this.canAccessIncident(user, incident)) {
      throw new ForbiddenException('No tienes permisos para ver esta incidencia');
    }
    return incident;
  }

  async updateIncident(user: AuthzUser, incidentId: string, dto: UpdateIncidentDto) {
    const incident = await this.getOrFailIncident(incidentId);
    if (!this.canAccessIncident(user, incident)) {
      throw new ForbiddenException('No tienes permisos para editar esta incidencia');
    }
    this.assertVersion(incident, dto.expected_version);

    const updates: Array<[string, string | null, string | null]> = [];
    let nextTitle = incident.title;
    let nextDescription = incident.description;
    let nextPriority = incident.priority;

    if (dto.title && dto.title.trim() !== incident.title) {
      updates.push(['title', incident.title, dto.title.trim()]);
      nextTitle = dto.title.trim();
    }
    if (dto.description && dto.description.trim() !== incident.description) {
      updates.push(['description', incident.description, dto.description.trim()]);
      nextDescription = dto.description.trim();
    }
    if (dto.priority && dto.priority !== incident.priority) {
      updates.push(['priority', incident.priority, dto.priority]);
      nextPriority = dto.priority;
    }

    if (updates.length === 0) {
      return incident;
    }

    const { rows } = await this.db.query<IncidentRow>(
      `
        UPDATE incidents
        SET title = $2,
            description = $3,
            priority = $4::incident_priority,
            version = version + 1,
            updated_at = NOW()
        WHERE id = $1
        RETURNING id,
                  ticket_number,
                  title,
                  description,
                  priority,
                  status,
                  reporter_id,
                  assignee_id,
                  version,
                  created_at,
                  updated_at,
                  resolved_at,
                  closed_at,
                  sla_deadline,
                  sla_breached
      `,
      [incidentId, nextTitle, nextDescription, nextPriority],
    );

    for (const [field, oldValue, newValue] of updates) {
      await this.pushTracking(incident.id, user.id, 'field_updated', {
        fieldChanged: field,
        oldValue,
        newValue,
      });

      if (field === 'priority') {
        await this.pushTracking(incident.id, user.id, 'priority_changed', {
          fieldChanged: field,
          oldValue,
          newValue,
        });
      }
    }

    return this.toIncidentRecord({
      ...rows[0],
      reporter_email: incident.reporterEmail,
    });
  }

  async assignIncident(user: AuthzUser, incidentId: string, dto: AssignIncidentDto) {
    this.assertAgentRole(user);
    const incident = await this.getOrFailIncident(incidentId);
    this.assertVersion(incident, dto.expected_version);

    const oldAssignee = incident.assigneeId;

    const { rows } = await this.db.query<IncidentRow>(
      `
        UPDATE incidents
        SET assignee_id = $2,
            status = CASE WHEN status = 'open'::incident_status THEN 'assigned'::incident_status ELSE status END,
            version = version + 1,
            updated_at = NOW()
        WHERE id = $1
        RETURNING id,
                  ticket_number,
                  title,
                  description,
                  priority,
                  status,
                  reporter_id,
                  assignee_id,
                  version,
                  created_at,
                  updated_at,
                  resolved_at,
                  closed_at,
                  sla_deadline,
                  sla_breached
      `,
      [incidentId, dto.assignee_id],
    );

    const updated = this.toIncidentRecord({
      ...rows[0],
      reporter_email: incident.reporterEmail,
    });

    await this.pushTracking(incident.id, user.id, 'assigned', {
      fieldChanged: 'assigneeId',
      oldValue: oldAssignee,
      newValue: dto.assignee_id,
    });

    this.events.broadcastIncidentUpdate({
      type: 'incident.assigned',
      incidentId: updated.id,
      ticketNumber: updated.ticketNumber,
      payload: { assigneeId: dto.assignee_id, status: updated.status },
      actorEmail: user.email,
      timestamp: updated.updatedAt,
    });

    if (dto.assignee_id !== user.id) {
      const assignee = await this.db.query<{ email: string }>(
        'SELECT email FROM users WHERE id = $1',
        [dto.assignee_id],
      );
      const assigneeEmail = assignee.rows[0]?.email;
      if (assigneeEmail) {
        this.notifications.notifyIncidentAssigned({
          assigneeEmail,
          ticketNumber: updated.ticketNumber,
          title: updated.title,
          assignedByEmail: user.email,
        });
      }
    }

    return updated;
  }

  async changeStatus(user: AuthzUser, incidentId: string, dto: ChangeStatusDto) {
    this.assertAgentRole(user);
    const incident = await this.getOrFailIncident(incidentId);
    this.assertVersion(incident, dto.expected_version);

    if (incident.status === dto.status) {
      return incident;
    }

    const allowed = TRANSITIONS[incident.status] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Transicion no permitida: ${incident.status} -> ${dto.status}`,
      );
    }

    if (dto.status === 'resolved' && !dto.comment) {
      throw new BadRequestException('Para resolver se requiere comentario');
    }
    if (dto.status === 'reopened' && !dto.comment) {
      throw new BadRequestException('Para reabrir se requiere comentario');
    }

    const previous = incident.status;
    const now = this.nowIso();
    const resolvedAt = dto.status === 'resolved' ? now : incident.resolvedAt;
    const closedAt = dto.status === 'closed' ? now : incident.closedAt;
    const computedIncident = {
      ...incident,
      status: dto.status,
      resolvedAt,
      closedAt,
      slaBreached: false,
    };
    const slaBreached = this.isSlaBreached(computedIncident);

    const { rows } = await this.db.query<IncidentRow>(
      `
        UPDATE incidents
        SET status = $2::incident_status,
            resolved_at = $3,
            closed_at = $4,
            sla_breached = $5,
            version = version + 1,
            updated_at = NOW()
        WHERE id = $1
        RETURNING id,
                  ticket_number,
                  title,
                  description,
                  priority,
                  status,
                  reporter_id,
                  assignee_id,
                  version,
                  created_at,
                  updated_at,
                  resolved_at,
                  closed_at,
                  sla_deadline,
                  sla_breached
      `,
      [incidentId, dto.status, resolvedAt, closedAt, slaBreached],
    );

    const updated = this.toIncidentRecord({
      ...rows[0],
      reporter_email: incident.reporterEmail,
    });

    await this.pushTracking(incident.id, user.id, 'status_changed', {
      fieldChanged: 'status',
      oldValue: previous,
      newValue: dto.status,
      comment: dto.comment,
    });

    if (dto.status === 'resolved') {
      await this.pushTracking(incident.id, user.id, 'resolved', {
        comment: dto.comment ?? null,
      });
    }
    if (dto.status === 'closed') {
      await this.pushTracking(incident.id, user.id, 'closed', {
        comment: dto.comment ?? null,
      });
    }
    if (dto.status === 'reopened') {
      await this.pushTracking(incident.id, user.id, 'reopened', {
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
      timestamp: updated.updatedAt,
    });
    this.events.broadcastIncidentUpdate({
      type: 'incident.status_changed',
      incidentId: incident.id,
      ticketNumber: incident.ticketNumber,
      payload: { status: updated.status, priority: updated.priority },
      actorEmail: user.email,
      timestamp: updated.updatedAt,
    });

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

    return updated;
  }

  async getTracking(user: AuthzUser, incidentId: string) {
    const incident = await this.getOrFailIncident(incidentId);
    if (!this.canAccessIncident(user, incident)) {
      throw new ForbiddenException('No tienes permisos para ver esta incidencia');
    }

    const { rows } = await this.db.query<TrackingRow>(
      `
        SELECT id,
               incident_id,
               actor_id,
               event_type,
               comment,
               field_changed,
               old_value,
               new_value,
               created_at
        FROM tracking_events
        WHERE incident_id = $1
        ORDER BY created_at ASC
      `,
      [incidentId],
    );

    return rows.map((row) => this.toTrackingRecord(row));
  }

  async listComments(user: AuthzUser, incidentId: string) {
    const incident = await this.getOrFailIncident(incidentId);
    if (!this.canAccessIncident(user, incident)) {
      throw new ForbiddenException('No tienes permisos para ver esta incidencia');
    }

    const params: unknown[] = [incidentId];
    let where = 'WHERE incident_id = $1';
    if (!AGENT_ROLES.has(user.role)) {
      where += ' AND is_internal = false';
    }

    const { rows } = await this.db.query<CommentRow>(
      `
        SELECT id, incident_id, author_id, body, is_internal, created_at
        FROM incident_comments
        ${where}
        ORDER BY created_at ASC
      `,
      params,
    );

    return rows.map((row) => this.toCommentRecord(row));
  }

  async addComment(user: AuthzUser, incidentId: string, dto: CreateCommentDto) {
    const incident = await this.getOrFailIncident(incidentId);
    if (!this.canAccessIncident(user, incident)) {
      throw new ForbiddenException('No tienes permisos para comentar');
    }

    const isInternal = dto.is_internal ?? false;
    if (isInternal && !AGENT_ROLES.has(user.role)) {
      throw new ForbiddenException(
        'Solo agentes pueden crear comentarios internos',
      );
    }

    const { rows } = await this.db.query<CommentRow>(
      `
        INSERT INTO incident_comments (
          incident_id,
          author_id,
          body,
          is_internal,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        RETURNING id, incident_id, author_id, body, is_internal, created_at
      `,
      [incidentId, user.id, dto.body.trim(), isInternal],
    );

    const comment = this.toCommentRecord(rows[0]);

    await this.pushTracking(incidentId, user.id, 'comment_added', {
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
