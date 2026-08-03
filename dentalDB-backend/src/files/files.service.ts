import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { join } from 'path';
import { UPLOADS_DIR } from '../common/utils/uploads-dir.util';
import { unlinkSync, existsSync } from 'fs';
import { PatientFile, FileCategory } from './entities/patient-file.entity';
import { isOfflineSqlite } from '../sync/pending-sync.util';

@Injectable()
export class FilesService {
  constructor(
    @InjectRepository(PatientFile) private repo: Repository<PatientFile>,
  ) {}

  async upload(
    clinicId: string,
    patientId: string,
    file: Express.Multer.File,
    dto: { category?: FileCategory; description?: string; uploadedByUserId?: string },
  ): Promise<PatientFile> {
    const record = this.repo.create({
      clinicId,
      patientId,
      originalName: file.originalname,
      storedName:   file.filename,
      mimeType:     file.mimetype,
      size:         file.size,
      path:         file.path,
      category:     dto.category || FileCategory.OTHER,
      description:  dto.description,
      uploadedByUserId: dto.uploadedByUserId,
      // Created on the offline/desktop instance -> the bytes only exist on
      // THIS machine's disk right now and still need to make it to the
      // hosted backend (see SyncService.pushPendingFileBlobs). Created
      // directly on the hosted instance (web/mobile upload) -> the bytes
      // are already exactly where they need to be, nothing to push.
      blobSyncStatus: isOfflineSqlite() ? 'pending' : 'synced',
    });
    return this.repo.save(record);
  }

  async findByPatient(clinicId: string, patientId: string): Promise<PatientFile[]> {
    return this.repo.find({
      where: { clinicId, patientId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Cross-clinic lookup for the patient portal — no clinicId filter, since a
   * PatientAccount can be linked to Patient rows at several independent
   * clinics. Callers MUST pre-scope `patientIds` via PatientAccountLink so a
   * patient can never see another account's files.
   */
  async findByPatientIds(patientIds: string[]): Promise<PatientFile[]> {
    if (patientIds.length === 0) return [];
    return this.repo.find({
      where: { patientId: In(patientIds) },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(clinicId: string, id: string): Promise<PatientFile> {
    const file = await this.repo.findOne({ where: { id, clinicId } });
    if (!file) throw new NotFoundException('File not found');
    return file;
  }

  /**
   * Cross-clinic single-file lookup with NO clinicId filter — for the
   * patient portal, which scopes access via PatientAccountLink rather than
   * a clinic JWT. Callers MUST verify `file.patientId` is one of the
   * account's linked clinicPatientIds before returning/streaming it.
   */
  async findOneById(id: string): Promise<PatientFile> {
    const file = await this.repo.findOne({ where: { id } });
    if (!file) throw new NotFoundException('File not found');
    return file;
  }

  async delete(clinicId: string, id: string): Promise<void> {
    const file = await this.findOne(clinicId, id);
    // Delete from disk
    if (existsSync(file.path)) {
      try { unlinkSync(file.path); } catch {}
    }
    await this.repo.delete({ id, clinicId });
  }

  getAbsolutePath(file: PatientFile): string {
    return join(UPLOADS_DIR, file.storedName);
  }

  // ── Used by SyncService's file-blob push (see pushPendingFileBlobs) ──────

  /** Rows whose bytes still need to be pushed to the remote — only meaningful once the row itself has synced (a blob push before that would 404 remotely, since the row wouldn't exist there yet to attach it to). */
  async findPendingBlobSync(): Promise<PatientFile[]> {
    return this.repo.find({ where: { blobSyncStatus: 'pending', syncStatus: 'synced' } as any });
  }

  async markBlobSynced(id: string): Promise<void> {
    await this.repo.update({ id }, { blobSyncStatus: 'synced' } as any);
  }

  /**
   * Server-role counterpart of the above — called from
   * SyncController's POST /sync/files/:id/blob once bytes have actually
   * been written to THIS instance's disk under the row's existing
   * storedName. clinicId-scoped so a device can only mark blobs synced for
   * its own clinic's files (mirrors SyncDeviceGuard's req.syncClinicId).
   */
  async findOneForClinic(clinicId: string, id: string): Promise<PatientFile | null> {
    return this.repo.findOne({ where: { id, clinicId } });
  }
}