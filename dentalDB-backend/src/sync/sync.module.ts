import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { SyncMeta } from './entities/sync-meta.entity';
import { SyncService } from './sync.service';
import { SyncController } from './sync.controller';
import { ConnectivityService } from './connectivity.service';
import { HealthController } from './health.controller';
import { OutboxModule } from '../outbox/outbox.module';
import { PendingSyncSubscriber } from './pending-sync.subscriber';

@Module({
  imports: [
    TypeOrmModule.forFeature([SyncMeta]),
    HttpModule,
    OutboxModule,
  ],
  controllers: [SyncController, HealthController],
  providers: [SyncService, ConnectivityService, PendingSyncSubscriber],
  exports: [SyncService],
})
export class SyncModule {}
