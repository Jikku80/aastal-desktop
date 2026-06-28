import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1782620042829 implements MigrationInterface {
    name = 'Migration1782620042829'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "notifications" ("id" varchar PRIMARY KEY NOT NULL, "clinicId" varchar NOT NULL, "userId" varchar, "type" varchar CHECK( "type" IN ('appointment_created','appointment_updated','appointment_cancelled','appointment_reminder','invoice_created','invoice_paid','patient_added','history_access_requested','referral_received','refill_requested','refill_approved','leave_requested','leave_approved','leave_rejected','schedule_updated','shift_assigned','holiday_created','notice_posted','notice_updated','system') ) NOT NULL, "title" varchar NOT NULL, "body" varchar, "link" varchar, "entityId" varchar, "branchId" varchar, "isRead" boolean NOT NULL DEFAULT (0), "createdAt" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`CREATE INDEX "IDX_e1155e69f0a41720ad1f4689ef" ON "notifications" ("clinicId", "userId", "isRead") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_e1155e69f0a41720ad1f4689ef"`);
        await queryRunner.query(`DROP TABLE "notifications"`);
    }

}
