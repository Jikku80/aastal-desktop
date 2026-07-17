// src/common/redis-io.adapter.ts
//
// SCALABILITY FIX — see the removed SOCKET_IO_ADAPTER_FACTORY in
// appointments.module.ts/appointments.gateway.ts for the pattern this
// replaces.
//
// The old approach wired the Socket.IO Redis adapter from inside
// AppointmentsGateway.afterInit(io: Server), which only reliably affects
// the '/appointments' namespace: socket.io's Server.adapter(ctor) sets the
// adapter *constructor* used when a namespace is (re)initialized, but each
// `@WebSocketGateway({ namespace })` in this app (appointments,
// notifications, waiting-queue) gets its own Namespace object, and Nest
// creates/initializes those independently of each other and not
// necessarily after AppointmentsGateway has run its afterInit hook. In a
// horizontally-scaled deployment (multiple backend instances behind a load
// balancer — exactly the "handle thousands of users" scenario) that meant:
//   - a client connected to instance A would reliably get cross-instance
//     '/appointments' events (that gateway wired its own adapter), but
//   - '/notifications' and '/queue' events (new patient notification,
//     waiting-room position updates) would only reach OTHER CLIENTS ON THE
//     SAME INSTANCE, because those two namespaces never got a Redis
//     adapter at all — they silently kept socket.io's default in-memory
//     adapter, which only knows about sockets connected to that one
//     process. A patient's queue-position update, or a staff notification,
//     could simply never arrive if the two people happened to be
//     socket-connected to different instances behind the load balancer.
//
// The correct, supported way to share ONE adapter across every namespace
// in the app is to set it once at the Socket.IO *Server* level before any
// namespace is created — i.e. in the platform adapter Nest uses to build
// the server in the first place (app.useWebSocketAdapter in main.ts),
// not from inside any individual gateway's lifecycle hook.

import { INestApplicationContext, Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';

export class RedisIoAdapter extends IoAdapter {
  private static readonly logger = new Logger(RedisIoAdapter.name);
  private static adapterConstructor: any = null;
  private static connecting: Promise<void> | null = null;

  constructor(app: INestApplicationContext, private readonly redisUrl: string | undefined) {
    super(app);
  }

  /**
   * Connects to Redis (once, shared across every namespace) before the
   * HTTP server starts accepting Socket.IO connections. Call this from
   * bootstrap() and await it prior to app.listen() — see main.ts.
   * No-ops when REDIS_URL isn't set: every namespace then falls back to
   * socket.io's default in-memory adapter, which is correct for a single
   * dev/CI instance but NOT for horizontal scaling in production.
   */
  async connectToRedis(): Promise<void> {
    if (!this.redisUrl) {
      RedisIoAdapter.logger.warn(
        'REDIS_URL not set — Socket.IO using in-memory adapter (fine for a single instance; ' +
        'real-time events will NOT reach clients connected to a different instance once you scale horizontally)',
      );
      return;
    }
    if (RedisIoAdapter.adapterConstructor) return; // already connected (e.g. re-used across a hot reload)
    if (RedisIoAdapter.connecting) return RedisIoAdapter.connecting;

    RedisIoAdapter.connecting = (async () => {
      const { createAdapter } = await import('@socket.io/redis-adapter');
      const { createClient } = await import('redis');
      const pub = createClient({ url: this.redisUrl });
      const sub = pub.duplicate();
      pub.on('error', (err) => RedisIoAdapter.logger.error(`Redis pub client error: ${err?.message ?? err}`));
      sub.on('error', (err) => RedisIoAdapter.logger.error(`Redis sub client error: ${err?.message ?? err}`));
      await Promise.all([pub.connect(), sub.connect()]);
      RedisIoAdapter.adapterConstructor = createAdapter(pub, sub);
      RedisIoAdapter.logger.log('Socket.IO Redis adapter connected — every namespace now shares events across all instances');
    })();

    return RedisIoAdapter.connecting;
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);
    // Applied at the Server level BEFORE any namespace is created (Nest
    // hasn't registered any @WebSocketGateway namespaces yet at this point
    // in bootstrap), so every namespace — '/appointments', '/notifications',
    // '/queue', and any future one — inherits it uniformly. This is the
    // one difference that matters vs. the old per-gateway afterInit() hack.
    if (RedisIoAdapter.adapterConstructor) {
      server.adapter(RedisIoAdapter.adapterConstructor);
    }
    return server;
  }
}