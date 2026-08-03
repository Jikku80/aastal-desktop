import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { Clinic } from '../../clinics/entities/clinic.entity';
import { Branch } from '../../branch/entities/branch.entity';

/**
 * A photo captured at a branch's local machine (e.g. an x-ray sensor or
 * camera watched-folder — see electron/watched-folder.js) and pushed up
 * to the hosted backend by electron/gallery-sync.js, so it's visible from
 * the WEB app too, not just on the one desktop machine that captured it.
 *
 * Deliberately NOT part of the generic entity-sync engine
 * (see sync/sync-registry.ts) — this is an online-only, one-directional
 * record: it only ever gets created here (via POST /gallery/sync, guarded
 * by the same per-device token as the rest of sync), never pulled back
 * down to a desktop instance. The desktop's own copy of the same photo
 * already lives in its local gallery-store.js manifest independently.
 */
@Entity('gallery_items')
@Index(['clinicId', 'branchId'])
export class GalleryItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  clinicId: string;

  @ManyToOne(() => Clinic, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clinicId' })
  clinic: Clinic;

  /** Which branch's capture machine this photo came from — every list/query is scoped to this. */
  @Column()
  branchId: string;

  @ManyToOne(() => Branch, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'branchId' })
  branch: Branch;

  @Column()
  fileName: string;

  /** Filename on disk under UPLOADS_DIR — see uploads-dir.util.ts. */
  @Column()
  storedName: string;

  @Column()
  mimeType: string;

  @Column({ type: 'bigint' })
  size: number;

  /** Which registered sync device pushed this item — see SyncDevice. */
  @Column({ nullable: true })
  deviceId: string;

  /** When the photo was actually captured on the branch machine (may predate createdAt if it was queued offline). */
  @Column({ type: 'timestamp', nullable: true })
  capturedAt: Date;

  @Column({ nullable: true })
  attachedPatientId: string;

  @Column({ type: 'timestamp', nullable: true })
  attachedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
