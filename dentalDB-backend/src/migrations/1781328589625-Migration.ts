import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1781328589625 implements MigrationInterface {
    name = 'Migration1781328589625'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "nmcNo" character varying`);
        await queryRunner.query(`ALTER TABLE "patients" ADD "opdNo" character varying`);
        await queryRunner.query(`ALTER TABLE "payroll_deduction_rules" ALTER COLUMN "halfDayDeductionRate" SET DEFAULT '0.5'`);
        await queryRunner.query(`ALTER TABLE "payroll_deduction_rules" ALTER COLUMN "overtimeRateMultiplier" SET DEFAULT '1.5'`);
        await queryRunner.query(`ALTER TABLE "invoices" ALTER COLUMN "invoiceUuid" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "invoices" ALTER COLUMN "invoiceUuid" SET DEFAULT gen_random_uuid()`);
        await queryRunner.query(`CREATE INDEX "IDX_d28bd166a2edcb20cfe9fb487e" ON "patients" ("clinicId", "opdNo") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_d28bd166a2edcb20cfe9fb487e"`);
        await queryRunner.query(`ALTER TABLE "invoices" ALTER COLUMN "invoiceUuid" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "invoices" ALTER COLUMN "invoiceUuid" SET DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "payroll_deduction_rules" ALTER COLUMN "overtimeRateMultiplier" SET DEFAULT 1.5`);
        await queryRunner.query(`ALTER TABLE "payroll_deduction_rules" ALTER COLUMN "halfDayDeductionRate" SET DEFAULT 0.5`);
        await queryRunner.query(`ALTER TABLE "patients" DROP COLUMN "opdNo"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "nmcNo"`);
    }

}
