import { Body, Controller, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
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
    return this.sync.fullSync();
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