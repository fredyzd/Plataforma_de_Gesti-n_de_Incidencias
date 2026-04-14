import { Injectable } from '@nestjs/common';
import { IncidentsService } from '../incidents/incidents.service';
import type { IncidentRecord } from '../incidents/incidents.types';

const ACTIVE_STATUSES = new Set([
  'open',
  'assigned',
  'in_progress',
  'awaiting_info',
  'awaiting_vendor',
  'reopened',
]);
const CLOSED_STATUSES = new Set(['closed', 'resolved']);

@Injectable()
export class ReportsService {
  constructor(private readonly incidentsService: IncidentsService) {}

  private all(): IncidentRecord[] {
    return this.incidentsService.getAllIncidents();
  }

  getSummary() {
    const all = this.all();
    const now = new Date();

    const byStatus = Object.fromEntries(
      [
        'open',
        'assigned',
        'in_progress',
        'awaiting_info',
        'awaiting_vendor',
        'resolved',
        'closed',
        'reopened',
      ].map((s) => [s, all.filter((i) => i.status === s).length]),
    );

    const byPriority = Object.fromEntries(
      ['critical', 'high', 'medium', 'low'].map((p) => [
        p,
        all.filter((i) => i.priority === p).length,
      ]),
    );

    // MTTR en horas (solo incidencias resueltas/cerradas)
    const resolved = all.filter((i) => i.resolvedAt ?? i.closedAt);
    const mttrHours =
      resolved.length > 0
        ? resolved.reduce((acc, i) => {
            const end = new Date(i.resolvedAt ?? i.closedAt!);
            const start = new Date(i.createdAt);
            return acc + (end.getTime() - start.getTime()) / 3_600_000;
          }, 0) / resolved.length
        : null;

    // SLA
    const closedAll = all.filter((i) => CLOSED_STATUSES.has(i.status));
    const slaCompliant = closedAll.filter((i) => !i.slaBreached).length;
    const slaBreached = closedAll.filter((i) => i.slaBreached).length;
    const slaCompliancePct =
      closedAll.length > 0
        ? Math.round((slaCompliant / closedAll.length) * 100)
        : null;

    // SLA actualmente vencido en tickets abiertos
    const overdueActive = all.filter(
      (i) => ACTIVE_STATUSES.has(i.status) && new Date(i.slaDeadlineAt) < now,
    ).length;

    // Tickets creados hoy
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const createdToday = all.filter(
      (i) => new Date(i.createdAt) >= todayStart,
    ).length;

    return {
      totals: {
        all: all.length,
        active: all.filter((i) => ACTIVE_STATUSES.has(i.status)).length,
        closed: closedAll.length,
        createdToday,
      },
      byStatus,
      byPriority,
      sla: {
        compliant: slaCompliant,
        breached: slaBreached,
        compliancePct: slaCompliancePct,
        overdueActive,
      },
      mttrHours: mttrHours !== null ? Math.round(mttrHours * 10) / 10 : null,
    };
  }

  getAging() {
    const all = this.all();
    const now = new Date();
    const active = all.filter((i) => ACTIVE_STATUSES.has(i.status));

    const buckets = [
      { label: '< 24 horas', min: 0, max: 24 },
      { label: '1-3 días', min: 24, max: 72 },
      { label: '3-7 días', min: 72, max: 168 },
      { label: '> 7 días', min: 168, max: Infinity },
    ];

    return buckets.map(({ label, min, max }) => {
      const tickets = active.filter((i) => {
        const ageHours =
          (now.getTime() - new Date(i.createdAt).getTime()) / 3_600_000;
        return ageHours >= min && ageHours < max;
      });
      return {
        range: label,
        count: tickets.length,
        tickets: tickets.map((i) => ({
          id: i.id,
          ticketNumber: i.ticketNumber,
          title: i.title,
          priority: i.priority,
          status: i.status,
          createdAt: i.createdAt,
        })),
      };
    });
  }

  getSlaDetail() {
    const all = this.all();
    const now = new Date();

    return all
      .filter((i) => ACTIVE_STATUSES.has(i.status))
      .map((i) => {
        const deadline = new Date(i.slaDeadlineAt);
        const remainingMs = deadline.getTime() - now.getTime();
        const remainingHours = Math.round((remainingMs / 3_600_000) * 10) / 10;
        const breached = remainingMs < 0;
        const warningThreshold = breached
          ? false
          : remainingHours <
            ({ critical: 1, high: 2, medium: 6, low: 24 }[i.priority] ?? 6);

        return {
          id: i.id,
          ticketNumber: i.ticketNumber,
          title: i.title,
          priority: i.priority,
          status: i.status,
          slaDeadlineAt: i.slaDeadlineAt,
          remainingHours,
          breached,
          warning: warningThreshold,
        };
      })
      .sort((a, b) => a.remainingHours - b.remainingHours);
  }
}
