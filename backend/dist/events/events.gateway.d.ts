import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
export type IncidentEventType = 'incident.created' | 'incident.updated' | 'incident.status_changed' | 'incident.assigned' | 'incident.comment_added' | 'incident.attachment_added';
export interface IncidentEvent {
    type: IncidentEventType;
    incidentId: string;
    ticketNumber: string;
    payload: Record<string, unknown>;
    actorEmail: string;
    timestamp: string;
}
export declare class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    server: Server;
    private readonly logger;
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleJoinIncident(data: {
        incidentId: string;
    }, client: Socket): {
        joined: string;
    };
    handleLeaveIncident(data: {
        incidentId: string;
    }, client: Socket): void;
    emitToIncident(incidentId: string, event: IncidentEvent): void;
    broadcastIncidentUpdate(event: IncidentEvent): void;
}
