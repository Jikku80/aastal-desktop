import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1779681273006 implements MigrationInterface {
    name = 'Migration1779681273006'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."tasks_status_enum" AS ENUM('pending', 'ongoing', 'completed', 'cancelled')`);
        await queryRunner.query(`CREATE TYPE "public"."tasks_priority_enum" AS ENUM('low', 'medium', 'high')`);
        await queryRunner.query(`CREATE TABLE "tasks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "clinicId" character varying NOT NULL, "title" character varying NOT NULL, "description" text, "status" "public"."tasks_status_enum" NOT NULL DEFAULT 'pending', "priority" "public"."tasks_priority_enum" NOT NULL DEFAULT 'medium', "assignedToUserId" uuid, "assignedToBranchId" uuid, "createdByUserId" uuid, "dueDate" date, "completionNote" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8d12ff38fcc62aaba2cab748772" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_d103316176a06d50516ce46b9a" ON "tasks" ("clinicId", "assignedToBranchId") `);
        await queryRunner.query(`CREATE INDEX "IDX_bb65e84c1fe8173d9331ce481d" ON "tasks" ("clinicId", "assignedToUserId") `);
        await queryRunner.query(`CREATE INDEX "IDX_b6b51ebc5acf9aee75b77d3e47" ON "tasks" ("clinicId", "status") `);
        await queryRunner.query(`CREATE TABLE "dental_charts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "clinicId" character varying NOT NULL, "patientId" uuid NOT NULL, "teeth" jsonb NOT NULL DEFAULT '{}', "history" jsonb NOT NULL DEFAULT '[]', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_61d7de4ab7c639d23f075e8d514" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_e08fde14583ed9c1c381b2e0a0" ON "dental_charts" ("clinicId", "patientId") `);
        await queryRunner.query(`ALTER TABLE "payroll_deduction_rules" ALTER COLUMN "halfDayDeductionRate" SET DEFAULT '0.5'`);
        await queryRunner.query(`ALTER TABLE "payroll_deduction_rules" ALTER COLUMN "overtimeRateMultiplier" SET DEFAULT '1.5'`);
        await queryRunner.query(`ALTER TABLE "invoices" ALTER COLUMN "invoiceUuid" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "invoices" ALTER COLUMN "invoiceUuid" SET DEFAULT gen_random_uuid()`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD CONSTRAINT "FK_1740b7333a571b8dba8f299ca84" FOREIGN KEY ("assignedToUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD CONSTRAINT "FK_95efc455fad4d4424e2716c0175" FOREIGN KEY ("assignedToBranchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tasks" ADD CONSTRAINT "FK_e3f6e0d1ae9286f293a2e0111fd" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "dental_charts" ADD CONSTRAINT "FK_ed1d05b02997c4e0a84a5af02d4" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "dental_charts" DROP CONSTRAINT "FK_ed1d05b02997c4e0a84a5af02d4"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_e3f6e0d1ae9286f293a2e0111fd"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_95efc455fad4d4424e2716c0175"`);
        await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT "FK_1740b7333a571b8dba8f299ca84"`);
        await queryRunner.query(`ALTER TABLE "invoices" ALTER COLUMN "invoiceUuid" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "invoices" ALTER COLUMN "invoiceUuid" SET DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "payroll_deduction_rules" ALTER COLUMN "overtimeRateMultiplier" SET DEFAULT 1.5`);
        await queryRunner.query(`ALTER TABLE "payroll_deduction_rules" ALTER COLUMN "halfDayDeductionRate" SET DEFAULT 0.5`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e08fde14583ed9c1c381b2e0a0"`);
        await queryRunner.query(`DROP TABLE "dental_charts"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b6b51ebc5acf9aee75b77d3e47"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_bb65e84c1fe8173d9331ce481d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d103316176a06d50516ce46b9a"`);
        await queryRunner.query(`DROP TABLE "tasks"`);
        await queryRunner.query(`DROP TYPE "public"."tasks_priority_enum"`);
        await queryRunner.query(`DROP TYPE "public"."tasks_status_enum"`);
    }

}
