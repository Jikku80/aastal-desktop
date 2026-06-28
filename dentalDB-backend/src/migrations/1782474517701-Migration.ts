import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1782474517701 implements MigrationInterface {
    name = 'Migration1782474517701'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notices" ADD "targetRoles" jsonb DEFAULT '[]'`);
        await queryRunner.query(`ALTER TABLE "lab_works" ADD "invoiceId" character varying`);
        await queryRunner.query(`ALTER TABLE "lab_works" ADD "billedAt" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "products" ADD "purchaseUnit" character varying`);
        await queryRunner.query(`ALTER TABLE "products" ADD "unitsPerPurchase" integer NOT NULL DEFAULT '1'`);
        await queryRunner.query(`ALTER TABLE "holidays" ADD "isRoleSpecific" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "holidays" ADD "targetRoles" jsonb DEFAULT '[]'`);
        await queryRunner.query(`ALTER TABLE "blood_tests" ADD "invoiceId" character varying`);
        await queryRunner.query(`ALTER TABLE "blood_tests" ADD "billedAt" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "payroll_deduction_rules" ALTER COLUMN "halfDayDeductionRate" SET DEFAULT '0.5'`);
        await queryRunner.query(`ALTER TABLE "payroll_deduction_rules" ALTER COLUMN "overtimeRateMultiplier" SET DEFAULT '1.5'`);
        await queryRunner.query(`ALTER TYPE "public"."notices_scope_enum" RENAME TO "notices_scope_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."notices_scope_enum" AS ENUM('clinic_wide', 'branch', 'team_member', 'role')`);
        await queryRunner.query(`ALTER TABLE "notices" ALTER COLUMN "scope" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "notices" ALTER COLUMN "scope" TYPE "public"."notices_scope_enum" USING "scope"::"text"::"public"."notices_scope_enum"`);
        await queryRunner.query(`ALTER TABLE "notices" ALTER COLUMN "scope" SET DEFAULT 'clinic_wide'`);
        await queryRunner.query(`DROP TYPE "public"."notices_scope_enum_old"`);
        await queryRunner.query(`ALTER TABLE "invoices" ALTER COLUMN "invoiceUuid" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "invoices" ALTER COLUMN "invoiceUuid" SET DEFAULT gen_random_uuid()`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "invoices" ALTER COLUMN "invoiceUuid" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "invoices" ALTER COLUMN "invoiceUuid" SET DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`CREATE TYPE "public"."notices_scope_enum_old" AS ENUM('clinic_wide', 'branch', 'team_member')`);
        await queryRunner.query(`ALTER TABLE "notices" ALTER COLUMN "scope" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "notices" ALTER COLUMN "scope" TYPE "public"."notices_scope_enum_old" USING "scope"::"text"::"public"."notices_scope_enum_old"`);
        await queryRunner.query(`ALTER TABLE "notices" ALTER COLUMN "scope" SET DEFAULT 'clinic_wide'`);
        await queryRunner.query(`DROP TYPE "public"."notices_scope_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."notices_scope_enum_old" RENAME TO "notices_scope_enum"`);
        await queryRunner.query(`ALTER TABLE "payroll_deduction_rules" ALTER COLUMN "overtimeRateMultiplier" SET DEFAULT 1.5`);
        await queryRunner.query(`ALTER TABLE "payroll_deduction_rules" ALTER COLUMN "halfDayDeductionRate" SET DEFAULT 0.5`);
        await queryRunner.query(`ALTER TABLE "blood_tests" DROP COLUMN "billedAt"`);
        await queryRunner.query(`ALTER TABLE "blood_tests" DROP COLUMN "invoiceId"`);
        await queryRunner.query(`ALTER TABLE "holidays" DROP COLUMN "targetRoles"`);
        await queryRunner.query(`ALTER TABLE "holidays" DROP COLUMN "isRoleSpecific"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "unitsPerPurchase"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "purchaseUnit"`);
        await queryRunner.query(`ALTER TABLE "lab_works" DROP COLUMN "billedAt"`);
        await queryRunner.query(`ALTER TABLE "lab_works" DROP COLUMN "invoiceId"`);
        await queryRunner.query(`ALTER TABLE "notices" DROP COLUMN "targetRoles"`);
    }

}
