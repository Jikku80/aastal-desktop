import { MigrationInterface, QueryRunner } from "typeorm";

// Adds patient_files.blobSyncStatus — tracks whether a file's actual BYTES
// (not just its metadata row) have made it to this instance, separately
// from the existing `syncStatus` column (which only ever tracked the row).
//
// Why this is needed: the generic sync engine (SyncService) only ever
// moved database rows between instances — see pushPending()/applyIncoming().
// A PatientFile row created offline on a desktop install would sync its
// metadata (filename, category, patientId, etc.) up to the hosted backend
// just fine, but the actual image bytes stayed on that one desktop's local
// disk (UPLOADS_DIR) forever — the row existed remotely, pointing at a file
// that was never actually uploaded there, so the web app would show a
// "file not found" error trying to preview/download it. See
// SyncService.pushPendingFileBlobs() and SyncController's
// POST /sync/files/:id/blob for the fix that uses this column.
//
// Defaults to 'synced' (not 'pending') because for every EXISTING row —
// and every row created directly on whichever instance's own disk (the
// normal case: hosted backend creates the row AND has the bytes,
// simultaneously) — the bytes are already exactly where they need to be.
// Only PatientFilesService.upload() explicitly sets 'pending' instead, and
// only when running on the offline/sqlite instance (see isOfflineSqlite()).
export class PatientFileBlobSync1785000000000 implements MigrationInterface {
    name = 'PatientFileBlobSync1785000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "patient_files" ADD "blobSyncStatus" character varying(20) NOT NULL DEFAULT 'synced'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "patient_files" DROP COLUMN "blobSyncStatus"`);
    }

}