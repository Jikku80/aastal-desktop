import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1783928682524 implements MigrationInterface {
    name = 'Migration1783928682524'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_fb5add00191f5790542f1d7f1d"`);
        await queryRunner.query(`ALTER TYPE "public"."audit_logs_entitytype_enum" RENAME TO "audit_logs_entitytype_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."audit_logs_entitytype_enum" AS ENUM('invoice', 'patient', 'appointment', 'user', 'prescription', 'clinical_record', 'product', 'recall', 'auth', 'purchase_order', 'holiday', 'notice', 'wallet')`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ALTER COLUMN "entityType" TYPE "public"."audit_logs_entitytype_enum" USING "entityType"::"text"::"public"."audit_logs_entitytype_enum"`);
        await queryRunner.query(`DROP TYPE "public"."audit_logs_entitytype_enum_old"`);
        await queryRunner.query(`ALTER TABLE "payroll_deduction_rules" ALTER COLUMN "halfDayDeductionRate" SET DEFAULT '0.5'`);
        await queryRunner.query(`ALTER TABLE "payroll_deduction_rules" ALTER COLUMN "overtimeRateMultiplier" SET DEFAULT '1.5'`);
        await queryRunner.query(`CREATE INDEX "IDX_fb5add00191f5790542f1d7f1d" ON "audit_logs" ("clinicId", "entityType", "createdAt") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_fb5add00191f5790542f1d7f1d"`);
        await queryRunner.query(`ALTER TABLE "payroll_deduction_rules" ALTER COLUMN "overtimeRateMultiplier" SET DEFAULT 1.5`);
        await queryRunner.query(`ALTER TABLE "payroll_deduction_rules" ALTER COLUMN "halfDayDeductionRate" SET DEFAULT 0.5`);
        await queryRunner.query(`CREATE TYPE "public"."audit_logs_entitytype_enum_old" AS ENUM('invoice', 'patient', 'appointment', 'user', 'prescription', 'clinical_record', 'product', 'recall', 'auth', 'purchase_order', 'holiday', 'notice')`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ALTER COLUMN "entityType" TYPE "public"."audit_logs_entitytype_enum_old" USING "entityType"::"text"::"public"."audit_logs_entitytype_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."audit_logs_entitytype_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."audit_logs_entitytype_enum_old" RENAME TO "audit_logs_entitytype_enum"`);
        await queryRunner.query(`CREATE INDEX "IDX_fb5add00191f5790542f1d7f1d" ON "audit_logs" ("clinicId", "entityType", "createdAt") `);
    }

}
