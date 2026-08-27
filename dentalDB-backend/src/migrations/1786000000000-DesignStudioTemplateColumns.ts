import { MigrationInterface, QueryRunner } from "typeorm";

// Phase 8 — Document Design Studio. Same jsonb-column pattern as the
// pre-existing billingTemplate/prescriptionTemplate on clinics.
export class DesignStudioTemplateColumns1786000000000 implements MigrationInterface {
    name = 'DesignStudioTemplateColumns1786000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "clinics" ADD "labReportTemplate" jsonb DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "clinics" ADD "financialStatementTemplate" jsonb DEFAULT '{}'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "clinics" DROP COLUMN "financialStatementTemplate"`);
        await queryRunner.query(`ALTER TABLE "clinics" DROP COLUMN "labReportTemplate"`);
    }
}
