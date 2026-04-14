import type { IncidentPriority } from '../incidents.types';
export declare class CreateIncidentDto {
    title: string;
    description: string;
    priority: IncidentPriority;
    system_id?: string;
}
