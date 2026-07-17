import {
  WebSocketGateway, WebSocketServer,
  SubscribeMessage, MessageBody, ConnectedSocket,
  OnGatewayConnection, OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  // Static origin (single FRONTEND_URL) breaks for every tenant subdomain
  // (clinic-a.clinickarobar.com, clinic-b.clinickarobar.com, ...) — the
  // socket.io handshake fails CORS and the client silently falls back to
  // whatever polling interval react-query has (or nothing, on the TV
  // display page). Mirrors the dynamic allowlist used for HTTP in main.ts
  // and for the /notifications namespace.
  cors: {
    origin: (origin: string, cb: (err: any, allow?: boolean) => void) => {
      const ROOT_DOMAIN = process.env.ROOT_DOMAIN || 'clinickarobar.com';
      const staticOrigins = new Set([
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        'http://localhost:3003',
        'http://127.0.0.1:3000',
        process.env.FRONTEND_URL,
      ].filter(Boolean));

      if (!origin) return cb(null, true); // server-to-server / same-origin
      if (staticOrigins.has(origin)) return cb(null, true);

      try {
        const host = new URL(origin).hostname;
        if (host === ROOT_DOMAIN || host.endsWith(`.${ROOT_DOMAIN}`)) return cb(null, true);
      } catch {
        // malformed origin — fall through to deny
      }
      cb(null, false);
    },
    credentials: true,
  },
  namespace: '/queue',
  // Allow long-polling fallback when a proxy/CDN in front of the app
  // doesn't forward the websocket Upgrade header — without this, clients
  // behind such a proxy never get realtime events, only the 30s poll.
  transports: ['websocket', 'polling'],
})
export class WaitingQueueGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(WaitingQueueGateway.name);

  constructor(
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  handleConnection(client: Socket) {
    try {
      const cookieHeader = client.handshake.headers?.cookie || '';
      const cookieMatch  = cookieHeader.match(/(?:^|;\s*)access_token=([^;]+)/);
      const token = cookieMatch?.[1]
        || client.handshake.auth?.token
        || (client.handshake.headers?.authorization as string)?.replace('Bearer ', '');

      if (!token) { client.disconnect(); return; }

      const payload = this.jwtService.verify(token, { secret: this.config.get('JWT_SECRET') });
      client.data.userId   = payload.sub;
      client.data.clinicId = payload.clinicId;
      client.data.role     = payload.role;

      this.logger.log(`Queue WS connected: user=${payload.sub} clinic=${payload.clinicId}`);
    } catch (err) {
      this.logger.warn(`Queue WS auth failed: ${(err as Error)?.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Queue WS disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-queue-room')
  handleJoinRoom(
    @MessageBody() data: { clinicId: string; branchId: string },
    @ConnectedSocket() client: Socket,
  ) {
    // Authorization: only allow joining the room for the clinic the
    // token was issued for — prevents one clinic's staff from listening
    // in on another clinic's live waiting-room feed.
    if (client.data.clinicId !== data.clinicId) {
      this.logger.warn(
        `Queue WS auth violation: user=${client.data.userId} tried to join clinic=${data.clinicId} but belongs to clinic=${client.data.clinicId}`,
      );
      client.disconnect();
      return { event: 'error', data: { message: 'Unauthorized' } };
    }

    const room = `clinic:${data.clinicId}:branch:${data.branchId}`;
    client.join(room);
    this.logger.log(`Client ${client.id} joined queue room: ${room}`);
    return { event: 'joined', data: room };
  }

  @SubscribeMessage('leave-queue-room')
  handleLeaveRoom(
    @MessageBody() data: { clinicId: string; branchId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const room = `clinic:${data.clinicId}:branch:${data.branchId}`;
    client.leave(room);
  }

  /** Broadcast queue update to all clients in the branch room */
  emitQueueUpdate(clinicId: string, branchId: string, payload: any) {
    if (!this.server) { this.logger.warn('WS server not ready — skipping emitQueueUpdate'); return; }
    const room = `clinic:${clinicId}:branch:${branchId}`;
    this.server.to(room).emit('queue:update', payload);
  }
}