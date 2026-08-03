import { MigrationInterface, QueryRunner } from "typeorm";

// SQLite/offline counterpart of 1785000000000-PatientFileBlobSync
// (postgres). Plain ADD COLUMN, same pattern as NotificationPatientId.
export class PatientFileBlobSync1785000000000 implements MigrationInterface {
    name = 'PatientFileBlobSync1785000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "patient_files" ADD COLUMN "blobSyncStatus" varchar NOT NULL DEFAULT 'synced'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "patient_files" DROP COLUMN "blobSyncStatus"`);
    }

}