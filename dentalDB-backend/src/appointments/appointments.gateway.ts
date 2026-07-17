import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true },
  namespace: '/appointments',
})
export class AppointmentsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(AppointmentsGateway.name);

  constructor(
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  // Cross-instance broadcasting (Redis adapter) is now wired once, globally,
  // in main.ts via RedisIoAdapter — applies to this namespace automatically,
  // no per-gateway setup needed here anymore. See src/common/redis-io.adapter.ts.

  handleConnection(client: Socket) {
    try {
      const cookieHeader = client.handshake.headers?.cookie || '';
      const match = cookieHeader.match(/(?:^|;\s*)access_token=([^;]+)/);
      const token = match?.[1];
      if (!token) { client.disconnect(); return; }
      const payload = this.jwtService.verify(token, { secret: this.config.get('JWT_SECRET') });
      client.data.userId   = payload.sub;
      client.data.clinicId = payload.clinicId;
      this.logger.log(`WS connected: user=${payload.sub}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-clinic')
  handleJoinClinic(@MessageBody() clinicId: string, @ConnectedSocket() client: Socket) {
    // Authorization: only allow joining the clinic the user actually belongs to
    if (client.data.clinicId !== clinicId) {
      this.logger.warn(
        `WS auth violation: user=${client.data.userId} tried to join clinic=${clinicId} but belongs to clinic=${client.data.clinicId}`,
      );
      client.disconnect();
      return { event: 'error', data: { message: 'Unauthorized' } };
    }
    client.join(`clinic:${clinicId}`);
    this.logger.log(`Client ${client.id} joined clinic room: ${clinicId}`);
    return { event: 'joined', data: { clinicId } };
  }

  @SubscribeMessage('leave-clinic')
  handleLeaveClinic(@MessageBody() clinicId: string, @ConnectedSocket() client: Socket) {
    client.leave(`clinic:${clinicId}`);
  }

  // Called from AppointmentsService to broadcast updates
  emitAppointmentCreated(clinicId: string, appointment: any) {
    this.server.to(`clinic:${clinicId}`).emit('appointment:created', appointment);
  }

  emitAppointmentUpdated(clinicId: string, appointment: any) {
    this.server.to(`clinic:${clinicId}`).emit('appointment:updated', appointment);
  }

  emitAppointmentCancelled(clinicId: string, appointmentId: string) {
    this.server.to(`clinic:${clinicId}`).emit('appointment:cancelled', { id: appointmentId });
  }
}