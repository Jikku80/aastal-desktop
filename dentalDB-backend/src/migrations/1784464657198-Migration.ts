import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1784464657198 implements MigrationInterface {
    name = 'Migration1784464657198'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "payroll_deduction_rules" ALTER COLUMN "halfDayDeductionRate" SET DEFAULT '0.5'`);
        await queryRunner.query(`ALTER TABLE "payroll_deduction_rules" ALTER COLUMN "overtimeRateMultiplier" SET DEFAULT '1.5'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "payroll_deduction_rules" ALTER COLUMN "overtimeRateMultiplier" SET DEFAULT 1.5`);
        await queryRunner.query(`ALTER TABLE "payroll_deduction_rules" ALTER COLUMN "halfDayDeductionRate" SET DEFAULT 0.5`);
    }

}
