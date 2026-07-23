import { MigrationInterface, QueryRunner } from "typeorm";

// Adds notifications.patientId — a nullable clinic-scoped Patient.id used to
// scope a notification to a specific patient. Patient-portal notification
// queries were previously filtered only by clinicId + type, which meant a
// patient could see every other patient's (doctor/staff-targeted) clinic
// notifications. See NotificationsService.createPatientQueryBuilder and
// PatientPortalService's notification methods, which now require this to
// match one of the requesting patient's own linked clinicPatientIds.
export class NotificationPatientId1784600000000 implements MigrationInterface {
    name = 'NotificationPatientId1784600000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notifications" ADD "patientId" character varying`);
        await queryRunner.query(`CREATE INDEX "IDX_notifications_patientId" ON "notifications" ("patientId")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_notifications_patientId"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "patientId"`);
    }

}
