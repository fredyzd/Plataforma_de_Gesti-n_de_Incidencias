"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsService = void 0;
const common_1 = require("@nestjs/common");
const incidents_service_1 = require("../incidents/incidents.service");
const ACTIVE_STATUSES = new Set(['open', 'assigned', 'in_progress', 'awaiting_info', 'awaiting_vendor', 'reopened']);
const CLOSED_STATUSES = new Set(['closed', 'resolved']);
let ReportsService = class ReportsService {
    incidentsService;
    constructor(incidentsService) {
        this.incidentsService = incidentsService;
    }
    all() {
        return this.incidentsService.getAllIncidents();
    }
    getSummary() {
        const all = this.all();
        const now = new Date();
        const byStatus = Object.fromEntries(['open', 'assigned', 'in_progress', 'awaiting_info', 'awaiting_vendor',
            'resolved', 'closed', 'reopened'].map((s) => [
            s,
            all.filter((i) => i.status === s).length,
        ]));
        const byPriority = Object.fromEntries(['critical', 'high', 'medium', 'low'].map((p) => [
            p,
            all.filter((i) => i.priority === p).length,
        ]));
        const resolved = all.filter((i) => i.resolvedAt ?? i.closedAt);
        const mttrHours = resolved.length > 0
            ? resolved.reduce((acc, i) => {
                const end = new Date(i.resolvedAt ?? i.closedAt);
                const start = new Date(i.createdAt);
                return acc + (end.getTime() - start.getTime()) / 3_600_000;
            }, 0) / resolved.length
            : null;
        const closedAll = all.filter((i) => CLOSED_STATUSES.has(i.status));
        const slaCompliant = closedAll.filter((i) => !i.slaBreached).length;
        const slaBreached = closedAll.filter((i) => i.slaBreached).length;
        const slaCompliancePct = closedAll.length > 0
            ? Math.round((slaCompliant / closedAll.length) * 100)
            : null;
        const overdueActive = all.filter((i) => ACTIVE_STATUSES.has(i.status) && new Date(i.slaDeadlineAt) < now).length;
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const createdToday = all.filter((i) => new Date(i.createdAt) >= todayStart).length;
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
                const ageHours = (now.getTime() - new Date(i.createdAt).getTime()) / 3_600_000;
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
            const remainingHours = Math.round(remainingMs / 3_600_000 * 10) / 10;
            const breached = remainingMs < 0;
            const warningThreshold = breached ? false : remainingHours < ({ critical: 1, high: 2, medium: 6, low: 24 }[i.priority] ?? 6);
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
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [incidents_service_1.IncidentsService])
], ReportsService);
//# sourceMappingURL=reports.service.js.map