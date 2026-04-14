import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

export type IncidentEventType =
  | 'incident.created'
  | 'incident.updated'
  | 'incident.status_changed'
  | 'incident.assigned'
  | 'incident.comment_added'
  | 'incident.attachment_added';

export interface IncidentEvent {
  type: IncidentEventType;
  incidentId: string;
  ticketNumber: string;
  payload: Record<string, unknown>;
  actorEmail: string;
  timestamp: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/events',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(EventsGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // Client joins a room for a specific incident
  @SubscribeMessage('join_incident')
  handleJoinIncident(
    @MessageBody() data: { incidentId: string },
    @ConnectedSocket() client: Socket,
  ) {
    void client.join(`incident:${data.incidentId}`);
    return { joined: data.incidentId };
  }

  @SubscribeMessage('leave_incident')
  handleLeaveIncident(
    @MessageBody() data: { incidentId: string },
    @ConnectedSocket() client: Socket,
  ) {
    void client.leave(`incident:${data.incidentId}`);
  }

  // Broadcast to all clients subscribed to an incident
  emitToIncident(incidentId: string, event: IncidentEvent) {
    this.server.to(`incident:${incidentId}`).emit('incident_event', event);
  }

  // Broadcast to all connected clients (for list view updates)
  broadcastIncidentUpdate(event: IncidentEvent) {
    this.server.emit('incident_list_update', event);
  }
}
