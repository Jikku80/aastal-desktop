import { Entity, PrimaryColumn, Column } from 'typeorm';

/** Local-only key/value store for sync bookkeeping (e.g. lastSyncAt). Never synced itself. */
@Entity('sync_meta')
export class SyncMeta {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  key: string;

  @Column({ type: 'text', nullable: true })
  value: string | null;
}
