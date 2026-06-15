import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: [process.env.FRONTEND_URL || 'http://localhost:3000', 'https://app.aplomb.in'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class EventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(EventsGateway.name);

  afterInit() {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // Client subscribes to a specific case room
  @SubscribeMessage('subscribe:case')
  handleSubscribeCase(@MessageBody() data: { caseId: string }, @ConnectedSocket() client: Socket) {
    client.join(`case:${data.caseId}`);
    return { subscribed: true, room: `case:${data.caseId}` };
  }

  // Client subscribes to dashboard by role
  @SubscribeMessage('subscribe:dashboard')
  handleSubscribeDashboard(
    @MessageBody() data: { role: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`dashboard:${data.role}`);
    return { subscribed: true, room: `dashboard:${data.role}` };
  }

  // ── Emit helpers ────────────────────────────────────────────

  emitCaseUpdate(caseId: string, event: string, data: any) {
    this.server.to(`case:${caseId}`).emit(`case:${event}`, data);
    // Also broadcast to dashboard rooms
    this.server.to('dashboard:admin').emit(`case:${event}`, data);
    this.server.to('dashboard:coordinator').emit(`case:${event}`, data);
  }

  emitReportUpdate(caseId: string, event: string, data: any) {
    this.server.to(`case:${caseId}`).emit(`report:${event}`, data);
  }

  emitNotification(userId: string, notification: any) {
    this.server.to(`user:${userId}`).emit('notification:new', notification);
  }

  emitMisUpdate(data: any) {
    this.server.to('dashboard:admin').emit('mis:updated', data);
    this.server.to('dashboard:coordinator').emit('mis:updated', data);
  }

  // Join personal room on auth
  @SubscribeMessage('join:personal')
  handleJoinPersonal(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`user:${data.userId}`);
    return { joined: true };
  }
}
