import {
  WebSocketGateway, WebSocketServer,
  SubscribeMessage, MessageBody, ConnectedSocket,
  OnGatewayConnection, OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  cors: {
    origin: (origin: string, cb: (err: any, allow?: boolean) => void) => {
      const allowed = [
        'http://localhost:3000',
        'http://localhost:3002',
        process.env.FRONTEND_URL,
      ].filter(Boolean);
      if (!origin || allowed.includes(origin) || (origin && origin.endsWith('.clinickarobar.com'))) {
        cb(null, true);
      } else {
        cb(null, false);
      }
    },
    credentials: true,
  },
  namespace: '/notifications',
  transports: ['websocket', 'polling'],
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const cookieHeader = client.handshake.headers?.cookie || '';
      const cookieMatch  = cookieHeader.match(/(?:^|;\s*)access_token=([^;]+)/);
      const token = cookieMatch?.[1]
        || client.handshake.auth?.token
        || client.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) { client.disconnect(); return; }

      const payload = this.jwtService.verify(token, { secret: this.config.get('JWT_SECRET') });
      client.data.userId   = payload.sub;
      client.data.clinicId = payload.clinicId;
      client.data.role     = payload.role;
      client.data.branchId = payload.branchId;

      // Join clinic room so we can broadcast to all clinic members
      client.join(`clinic:${payload.clinicId}`);
      // Join personal room for targeted notifications
      client.join(`user:${payload.sub}`);
      // Join branch room if user has an active branch
      if (payload.branchId) {
        client.join(`branch:${payload.branchId}`);
      }

      this.logger.log(`WS connected: user=${payload.sub} clinic=${payload.clinicId}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`WS disconnected: ${client.id}`);
  }

  @SubscribeMessage('mark_read')
  handleMarkRead(@MessageBody() id: string, @ConnectedSocket() client: Socket) {
    // Acknowledge — actual DB update done via REST
    return { event: 'marked_read', data: id };
  }

  /** Emit to everyone in the clinic */
  emitToClinic(clinicId: string, event: string, data: any) {
    if (!this.server) { this.logger.warn('WS server not ready — skipping emitToClinic'); return; }
    this.server.to(`clinic:${clinicId}`).emit(event, data);
  }

  /** Emit to a specific branch */
  emitToBranch(branchId: string, event: string, data: any) {
    if (!this.server) { this.logger.warn('WS server not ready — skipping emitToBranch'); return; }
    this.server.to(`branch:${branchId}`).emit(event, data);
  }

  /** Emit to a specific user */
  emitToUser(userId: string, event: string, data: any) {
    if (!this.server) { this.logger.warn('WS server not ready — skipping emitToUser'); return; }
    this.server.to(`user:${userId}`).emit(event, data);
  }

  // ── Patient room support ────────────────────────────────────────────────────
  // Patients connect with their patient_token (cookie). When they call
  // socket.emit('join-patient-room', { patientAccountId }) we verify the
  // patient_token cookie and join the room patient:{patientAccountId}.

  @SubscribeMessage('join-patient-room')
  async handleJoinPatientRoom(
    @MessageBody() data: { patientAccountId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      // Verify the patient_token cookie sent with the WS handshake
      const cookieHeader = client.handshake.headers?.cookie || '';
      const ptMatch = cookieHeader.match(/(?:^|;\s*)patient_token=([^;]+)/);
      const token = ptMatch?.[1] || client.handshake.auth?.patientToken;

      if (!token) {
        client.emit('error', { message: 'Missing patient token' });
        return;
      }

      // Verify using the patient JWT secret (separate from staff JWT_SECRET)
      const patientSecret = this.config.get('PATIENT_JWT_SECRET') || this.config.get('JWT_SECRET');
      const payload = this.jwtService.verify(token, { secret: patientSecret });

      // Only join the room if the token subject matches the requested account ID
      if (payload.sub !== data.patientAccountId) {
        client.emit('error', { message: 'Unauthorized' });
        return;
      }

      const room = `patient:${data.patientAccountId}`;
      client.join(room);
      client.data.patientAccountId = data.patientAccountId;
      this.logger.log(`WS patient joined room: ${room}`);
      client.emit('patient-room-joined', { room });
    } catch (err) {
      this.logger.warn(`join-patient-room failed: ${(err as Error)?.message}`);
      client.emit('error', { message: 'Invalid patient token' });
    }
  }

  /** Emit to a specific patient account room */
  emitToPatient(patientAccountId: string, event: string, data: any) {
    if (!this.server) { this.logger.warn('WS server not ready — skipping emitToPatient'); return; }
    this.server.to(`patient:${patientAccountId}`).emit(event, data);
  }

}