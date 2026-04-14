import type { IncidentStatus } from '../incidents.types';
export declare class ChangeStatusDto {
    status: IncidentStatus;
    expected_version: number;
    comment?: string;
}
