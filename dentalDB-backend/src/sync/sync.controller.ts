import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { SyncService } from './sync.service';
import { SyncSecretGuard } from './guards/sync-secret.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConnectivityService } from './connectivity.service';
import { OutboxService } from '../outbox/outbox.service';

@Controller('sync')
export class SyncController {
  constructor(
    private readonly sync: SyncService,
    private readonly connectivity: ConnectivityService,
    private readonly outbox: OutboxService,
  ) {}

  /**
   * Server-role endpoint — called by a remote/local peer that wants to pull
   * changes. Runs on whichever instance holds the data being asked about.
   */
  @Get('changes')
  @UseGuards(SyncSecretGuard)
  async changes(@Query('since') since?: string) {
    return this.sync.generateChangesSince(since ? new Date(since) : null);
  }

  /** Server-role endpoint — called by a peer pushing locally-pending records. */
  @Post('push')
  @UseGuards(SyncSecretGuard)
  async push(@Body() body: { entityName: string; records: any[] }) {
    return this.sync.applyIncoming(body.entityName, body.records);
  }

  /** This instance's own sync health — used by Phase 5 UI banners. */
  @Get('status')
  @UseGuards(JwtAuthGuard)
  async status() {
    const [syncStatus, outboxCounts] = await Promise.all([
      this.sync.getStatus(),
      this.outbox.countByStatus(),
    ]);
    return {
      ...syncStatus,
      isOnline: this.connectivity.getIsOnline(),
      outbox: outboxCounts,
    };
  }

  /**
   * Client-role manual trigger — normally invoked automatically on the
   * offline→online connectivity transition (Phase 4 wires this), exposed
   * here too for a "sync now" button and for debugging.
   */
  @Post('trigger')
  @UseGuards(JwtAuthGuard)
  async trigger() {
    return this.sync.fullSync();
  }
}
