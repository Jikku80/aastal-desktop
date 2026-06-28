import {
  WebSocketGateway, WebSocketServer,
  SubscribeMessage, MessageBody, ConnectedSocket,
  OnGatewayConnection, OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:3002', credentials: true },
  namespace: '/queue',
})
export class WaitingQueueGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(WaitingQueueGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Queue WS connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Queue WS disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-queue-room')
  handleJoinRoom(
    @MessageBody() data: { clinicId: string; branchId: string },
    @ConnectedSocket() client: Socket,
  ) {
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
    const room = `clinic:${clinicId}:branch:${branchId}`;
    this.server.to(room).emit('queue:update', payload);
  }
}