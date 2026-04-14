import type { IncidentPriority } from '../incidents.types';
export declare class UpdateIncidentDto {
    expected_version: number;
    title?: string;
    description?: string;
    priority?: IncidentPriority;
}
