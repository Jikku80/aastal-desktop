import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1782060615918 implements MigrationInterface {
    name = 'Migration1782060615918'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."blood_tests_testtype_enum" AS ENUM('cbc', 'blood_sugar', 'lipid_profile', 'lft', 'kft', 'thyroid', 'hba1c', 'blood_grouping', 'coagulation', 'electrolytes', 'vitamin_panel', 'hormone_panel', 'serology', 'other')`);
        await queryRunner.query(`CREATE TYPE "public"."blood_tests_status_enum" AS ENUM('pending', 'sample_collected', 'in_progress', 'completed', 'cancelled')`);
        await queryRunner.query(`CREATE TYPE "public"."blood_tests_priority_enum" AS ENUM('routine', 'urgent', 'stat')`);
        await queryRunner.query(`CREATE TABLE "blood_tests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "clinicId" character varying NOT NULL, "patientId" uuid NOT NULL, "orderedById" uuid NOT NULL, "appointmentId" character varying, "labName" character varying, "testType" "public"."blood_tests_testtype_enum" NOT NULL DEFAULT 'other', "testName" character varying NOT NULL, "testDescription" text, "status" "public"."blood_tests_status_enum" NOT NULL DEFAULT 'pending', "priority" "public"."blood_tests_priority_enum" NOT NULL DEFAULT 'routine', "fasting" boolean NOT NULL DEFAULT false, "clinicalNotes" text, "sampleCollectedAt" TIMESTAMP WITH TIME ZONE, "resultsReceivedAt" date, "patientNotifiedAt" TIMESTAMP WITH TIME ZONE, "results" jsonb, "resultSummary" text, "attachments" jsonb, "externalRef" character varying, "cost" numeric(10,2), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_5a1c4937553981a4313e819fac1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_1f38789ae766851d833963377d" ON "blood_tests" ("clinicId", "createdAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_3c7e196ba71bfcc217d7831866" ON "blood_tests" ("clinicId", "status") `);
        await queryRunner.query(`CREATE INDEX "IDX_b14c89bd1a360091fee9e2d3e2" ON "blood_tests" ("clinicId", "patientId") `);
        await queryRunner.query(`ALTER TABLE "payroll_deduction_rules" ALTER COLUMN "halfDayDeductionRate" SET DEFAULT '0.5'`);
        await queryRunner.query(`ALTER TABLE "payroll_deduction_rules" ALTER COLUMN "overtimeRateMultiplier" SET DEFAULT '1.5'`);
        await queryRunner.query(`ALTER TABLE "invoices" ALTER COLUMN "invoiceUuid" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "invoices" ALTER COLUMN "invoiceUuid" SET DEFAULT gen_random_uuid()`);
        await queryRunner.query(`ALTER TABLE "blood_tests" ADD CONSTRAINT "FK_2194bc34e8fa851efb57549e638" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "blood_tests" ADD CONSTRAINT "FK_353f036573ab7c5638389a09c09" FOREIGN KEY ("orderedById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "blood_tests" DROP CONSTRAINT "FK_353f036573ab7c5638389a09c09"`);
        await queryRunner.query(`ALTER TABLE "blood_tests" DROP CONSTRAINT "FK_2194bc34e8fa851efb57549e638"`);
        await queryRunner.query(`ALTER TABLE "invoices" ALTER COLUMN "invoiceUuid" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "invoices" ALTER COLUMN "invoiceUuid" SET DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "payroll_deduction_rules" ALTER COLUMN "overtimeRateMultiplier" SET DEFAULT 1.5`);
        await queryRunner.query(`ALTER TABLE "payroll_deduction_rules" ALTER COLUMN "halfDayDeductionRate" SET DEFAULT 0.5`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b14c89bd1a360091fee9e2d3e2"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3c7e196ba71bfcc217d7831866"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1f38789ae766851d833963377d"`);
        await queryRunner.query(`DROP TABLE "blood_tests"`);
        await queryRunner.query(`DROP TYPE "public"."blood_tests_priority_enum"`);
        await queryRunner.query(`DROP TYPE "public"."blood_tests_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."blood_tests_testtype_enum"`);
    }

}
