import { MigrationInterface, QueryRunner } from "typeorm";

// SQLite/offline counterpart of 1784600000000-NotificationPatientId
// (postgres). Plain ADD COLUMN, no FK — same pattern used for other
// optional columns added via migration in this set (see
// IndependentDoctorRoleScope), since SQLite can't add a FK constraint
// without a full table rebuild.
export class NotificationPatientId1784600000000 implements MigrationInterface {
    name = 'NotificationPatientId1784600000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notifications" ADD COLUMN "patientId" varchar`);
        await queryRunner.query(`CREATE INDEX "IDX_notifications_patientId" ON "notifications" ("patientId")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_notifications_patientId"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "patientId"`);
    }

}
