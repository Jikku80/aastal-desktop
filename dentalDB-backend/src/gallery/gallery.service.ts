import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { join } from 'path';
import { existsSync, unlinkSync } from 'fs';
import { UPLOADS_DIR } from '../common/utils/uploads-dir.util';
import { GalleryItem } from './entities/gallery-item.entity';

@Injectable()
export class GalleryService {
  constructor(
    @InjectRepository(GalleryItem) private repo: Repository<GalleryItem>,
  ) {}

  async create(data: {
    clinicId: string;
    branchId: string;
    fileName: string;
    storedName: string;
    mimeType: string;
    size: number;
    deviceId?: string;
    capturedAt?: Date;
  }): Promise<GalleryItem> {
    const item = this.repo.create(data);
    return this.repo.save(item);
  }

  /**
   * Branch-scoped list for the web gallery picker. `branchIds` MUST already
   * be pre-filtered by the caller to whichever branches the requesting
   * user is actually allowed to see (see BranchesService.getAccessibleBranchIds)
   * — this method trusts whatever list it's given.
   */
  async findByBranches(clinicId: string, branchIds: string[], includeAttached = false): Promise<GalleryItem[]> {
    if (branchIds.length === 0) return [];
    return this.repo.find({
      where: {
        clinicId,
        branchId: In(branchIds),
        ...(includeAttached ? {} : { attachedPatientId: null }),
      } as any,
      order: { createdAt: 'DESC' },
      take: 60, // recent-unattached picker, not a full library browser — mirrors electron's MAX_ITEMS
    });
  }

  async findOne(clinicId: string, id: string): Promise<GalleryItem> {
    const item = await this.repo.findOne({ where: { id, clinicId } });
    if (!item) throw new NotFoundException('Gallery item not found');
    return item;
  }

  /** branchIds MUST already be pre-filtered to the caller's accessible branches — same contract as findByBranches. */
  async findOneForBranches(clinicId: string, id: string, branchIds: string[]): Promise<GalleryItem> {
    const item = await this.findOne(clinicId, id);
    if (!branchIds.includes(item.branchId)) {
      throw new NotFoundException('Gallery item not found');
    }
    return item;
  }

  async markAttached(clinicId: string, id: string, patientId: string): Promise<GalleryItem> {
    const item = await this.findOne(clinicId, id);
    item.attachedPatientId = patientId;
    item.attachedAt = new Date();
    return this.repo.save(item);
  }

  async delete(clinicId: string, id: string): Promise<void> {
    const item = await this.findOne(clinicId, id);
    const abs = this.getAbsolutePath(item);
    if (existsSync(abs)) {
      try { unlinkSync(abs); } catch { /* already gone */ }
    }
    await this.repo.delete({ id, clinicId });
  }

  getAbsolutePath(item: GalleryItem): string {
    return join(UPLOADS_DIR, item.storedName);
  }
}
