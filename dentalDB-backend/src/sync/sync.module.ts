import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { SyncMeta } from './entities/sync-meta.entity';
import { SyncDevice } from './entities/sync-device.entity';
import { SyncService } from './sync.service';
import { SyncDevicesService } from './sync-devices.service';
import { SyncConfigStore } from './sync-config-store';
import { SyncController } from './sync.controller';
import { SyncDeviceGuard } from './guards/sync-device.guard';
import { ConnectivityService } from './connectivity.service';
import { HealthController } from './health.controller';
import { OutboxModule } from '../outbox/outbox.module';
import { PendingSyncSubscriber } from './pending-sync.subscriber';

@Module({
  imports: [
    TypeOrmModule.forFeature([SyncMeta, SyncDevice]),
    HttpModule,
    OutboxModule,
  ],
  controllers: [SyncController, HealthController],
  providers: [
    SyncService,
    SyncDevicesService,
    SyncConfigStore,
    SyncDeviceGuard,
    ConnectivityService,
    PendingSyncSubscriber,
  ],
  // SyncDevicesService is exported so AuthModule can call
  // registerDevice() directly from AuthService's post-login hook without
  // an HTTP round-trip to itself; SyncConfigStore is exported for the same
  // hook to persist the resulting token.
  exports: [SyncService, SyncDevicesService, SyncConfigStore],
})
export class SyncModule {}