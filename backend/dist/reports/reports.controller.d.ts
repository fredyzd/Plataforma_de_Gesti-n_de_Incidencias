import type { JwtAccessPayload } from '../auth/auth.types';
import { ReportsService } from './reports.service';
export declare class ReportsController {
    private readonly reportsService;
    constructor(reportsService: ReportsService);
    private assertAccess;
    getSummary(user: JwtAccessPayload): {
        totals: {
            all: number;
            active: number;
            closed: number;
            createdToday: number;
        };
        byStatus: {
            [k: string]: number;
        };
        byPriority: {
            [k: string]: number;
        };
        sla: {
            compliant: number;
            breached: number;
            compliancePct: number | null;
            overdueActive: number;
        };
        mttrHours: number | null;
    };
    getAging(user: JwtAccessPayload): {
        range: string;
        count: number;
        tickets: {
            id: string;
            ticketNumber: string;
            title: string;
            priority: import("../incidents/incidents.types").IncidentPriority;
            status: import("../incidents/incidents.types").IncidentStatus;
            createdAt: string;
        }[];
    }[];
    getSla(user: JwtAccessPayload): {
        id: string;
        ticketNumber: string;
        title: string;
        priority: import("../incidents/incidents.types").IncidentPriority;
        status: import("../incidents/incidents.types").IncidentStatus;
        slaDeadlineAt: string;
        remainingHours: number;
        breached: boolean;
        warning: boolean;
    }[];
}
