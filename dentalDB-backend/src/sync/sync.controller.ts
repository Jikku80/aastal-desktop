import { Body, Controller, Get, Param, Post, Query, Request, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { SyncService } from './sync.service';
import { SyncDevicesService } from './sync-devices.service';
import { SyncDeviceGuard } from './guards/sync-device.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { ConnectivityService } from './connectivity.service';
import { OutboxService } from '../outbox/outbox.service';
import { RegisterDeviceDto } from './dto/sync-device.dto';

@ApiTags('Sync')
@Controller('sync')
export class SyncController {
  constructor(
    private readonly sync: SyncService,
    private readonly devices: SyncDevicesService,
    private readonly connectivity: ConnectivityService,
    private readonly outbox: OutboxService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Server-role endpoint — called by a remote/local peer that wants to pull
   * changes. Runs on whichever instance holds the data being asked about.
   * req.syncClinicId comes from SyncDeviceGuard, which resolved it from the
   * caller's device token — every entity is filtered to that clinic only.
   */
  @Get('changes')
  @UseGuards(SyncDeviceGuard)
  async changes(@Request() req, @Query('since') since?: string) {
    return this.sync.generateChangesSince(since ? new Date(since) : null, req.syncClinicId);
  }

  /** Server-role endpoint — called by a peer pushing locally-pending records. */
  @Post('push')
  @UseGuards(SyncDeviceGuard)
  async push(@Request() req, @Body() body: { entityName: string; records: any[] }) {
    return this.sync.applyIncoming(body.entityName, body.records, req.syncClinicId);
  }

  /**
   * Server-role endpoint — the file-content counterpart of POST /sync/push.
   * That endpoint only ever moves the PatientFile database row; this one
   * receives the actual image/document bytes and writes them to disk under
   * the row's already-synced storedName. Deliberately NOT using the shared
   * FilesModule multer config (which mints a fresh random filename) — the
   * filename here must match the row that already arrived via /sync/push,
   * so this uses plain in-memory multer storage and writes the buffer to
   * the exact existing path itself (see SyncService.receiveFileBlob).
   */
  @Post('files/:id/blob')
  @ApiConsumes('multipart/form-data')
  @UseGuards(SyncDeviceGuard)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  async pushFileBlob(
    @Request() req,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.sync.receiveFileBlob(req.syncClinicId, id, file);
  }

  /** This instance's own sync health — used by Phase 5 UI banners. */
  @Get('status')
  @UseGuards(JwtAuthGuard)
  async status(@Request() req) {
    const [syncStatus, outboxCounts] = await Promise.all([
      this.sync.getStatus(req.user.clinicId),
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
    // The frontend's useOnlineStatus hook calls this unconditionally on
    // mount and on every browser 'online' event (see useOnlineStatus.ts) so
    // that the offline/Electron instance gets an immediate pull the moment
    // connectivity returns, without waiting out its poll interval. On the
    // hosted/online instance (no SYNC_REMOTE_BASE_URL — it IS the canonical
    // remote, there's nothing to sync with) that same call previously fell
    // through to SyncService.fullSync(), which threw
    // "SYNC_REMOTE_BASE_URL not configured", got caught by
    // AllExceptionsFilter, and logged an ERROR + 500 on essentially every
    // page load. Treat "not configured" as "nothing to do" here instead.
    if (!this.config.get<string>('SYNC_REMOTE_BASE_URL')) {
      return {
        pull: { pulled: 0, conflicts: 0 },
        push: { pushed: 0, conflicts: 0 },
        skipped: true,
        reason: 'SYNC_REMOTE_BASE_URL not configured — this instance is the canonical/online one',
      };
    }
    // SyncService.fullSync() now catches pull/push failures internally and
    // returns them as { error: '...' } on the relevant half instead of
    // throwing (see sync.service.ts) — this endpoint gets polled every 15s
    // and retried on every reconnect by design, so a transient remote
    // failure (remote temporarily down, or 500ing on one bad row) used to
    // hit AllExceptionsFilter and log a full ERROR + stack trace on EVERY
    // single cycle, drowning out logs that actually matter. fullSync()
    // itself is not expected to throw anymore, but this try/catch stays as
    // a last-resort safety net so a genuinely unexpected failure here still
    // degrades to a normal JSON error response instead of an uncaught 500.
    try {
      return await this.sync.fullSync();
    } catch (err: any) {
      return {
        pull: { pulled: 0, conflicts: 0 },
        push: { pushed: 0, conflicts: 0 },
        skipped: true,
        reason: `Sync trigger failed unexpectedly: ${err?.message ?? err}`,
      };
    }
  }

  // -----------------------------------------------------------------------
  // Device registration & admin management — replaces the manual
  // SYNC_SHARED_SECRET. See SyncDevicesService and SyncDeviceGuard.
  // -----------------------------------------------------------------------

  /**
   * Called automatically by a desktop install right after a normal login
   * (see AuthService.login's auto-registration hook) — JWT-authenticated,
   * no manual key entry. Mints a per-clinic token and returns it ONCE; the
   * caller is responsible for storing it (the Electron backend writes it
   * to sync-config.json via SyncConfigStore).
   */
  @ApiOperation({ summary: 'Register this desktop device and mint its per-clinic sync token (returned once)' })
  @Post('register-device')
  @UseGuards(JwtAuthGuard)
  async registerDevice(@Request() req, @Body() dto: RegisterDeviceDto) {
    const { device, rawToken } = await this.devices.registerDevice(req.user.clinicId, req.user.id, dto.deviceName);
    return { device, token: rawToken };
  }

  @ApiTags('Sync Devices')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List this clinic\'s registered sync devices (admin screen)' })
  @Get('devices')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.SUPER_ADMIN)
  async listDevices(@Request() req) {
    return this.devices.listForClinic(req.user.clinicId);
  }

  @ApiOperation({ summary: 'Revoke a sync device — use for a lost/stolen laptop' })
  @Post('devices/:id/revoke')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.SUPER_ADMIN)
  async revokeDevice(@Request() req, @Param('id') id: string) {
    return this.devices.revoke(req.user.clinicId, id);
  }
}