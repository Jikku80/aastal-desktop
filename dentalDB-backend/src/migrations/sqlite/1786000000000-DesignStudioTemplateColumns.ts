import { MigrationInterface, QueryRunner } from "typeorm";

// Phase 8 — Document Design Studio. Plain ADD COLUMN is safe here (no CHECK
// constraint or FK involved, unlike the audit_logs enum migrations), so no
// table rebuild is needed on SQLite.
export class DesignStudioTemplateColumns1786000000000 implements MigrationInterface {
    name = 'DesignStudioTemplateColumns1786000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "clinics" ADD COLUMN "labReportTemplate" text DEFAULT ('{}')`);
        await queryRunner.query(`ALTER TABLE "clinics" ADD COLUMN "financialStatementTemplate" text DEFAULT ('{}')`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "clinics" DROP COLUMN "financialStatementTemplate"`);
        await queryRunner.query(`ALTER TABLE "clinics" DROP COLUMN "labReportTemplate"`);
    }
}
