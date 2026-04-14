import { IncidentsService } from '../incidents/incidents.service';
export declare class ReportsService {
    private readonly incidentsService;
    constructor(incidentsService: IncidentsService);
    private all;
    getSummary(): {
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
    getAging(): {
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
    getSlaDetail(): {
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
