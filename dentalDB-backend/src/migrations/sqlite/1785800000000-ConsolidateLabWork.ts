import { MigrationInterface, QueryRunner } from "typeorm";

// Phase 5 — SQLite mirror of ../1785800000000-ConsolidateLabWork.ts. See
// that file for the full rationale (blood-test → lab-work consolidation +
// dynamic lab_services catalog). Ids are preserved across the copy so any
// historical invoice item still carrying a `bloodTestId` keeps resolving.
export class ConsolidateLabWork1785800000000 implements MigrationInterface {
    name = 'ConsolidateLabWork1785800000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // ── 1. Dynamic lab service catalog ──────────────────────────────────
        await queryRunner.query(`
            CREATE TABLE "lab_services" (
                "syncStatus" varchar(20) NOT NULL DEFAULT ('synced'),
                "id" varchar PRIMARY KEY NOT NULL,
                "clinicId" varchar NOT NULL,
                "name" varchar NOT NULL,
                "category" varchar,
                "panelName" varchar,
                "defaultPrice" decimal(10,2),
                "defaultTurnaroundHours" integer,
                "defaultParameters" text,
                "isActive" boolean NOT NULL DEFAULT (1),
                "notes" text,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now'))
            )
        `);
        await queryRunner.query(`CREATE INDEX "IDX_lab_services_clinicId_isActive" ON "lab_services" ("clinicId", "isActive")`);
        await queryRunner.query(`CREATE INDEX "IDX_lab_services_clinicId_category" ON "lab_services" ("clinicId", "category")`);

        // ── 2. Extend lab_works to absorb blood_tests-only columns ─────────
        await queryRunner.query(`ALTER TABLE "lab_works" ADD COLUMN "testType" varchar`);
        await queryRunner.query(`ALTER TABLE "lab_works" ADD COLUMN "fasting" boolean NOT NULL DEFAULT (0)`);
        await queryRunner.query(`ALTER TABLE "lab_works" ADD COLUMN "serviceIds" text`);

        // ── 3. Migrate blood_tests rows into lab_works, id preserved ───────
        // status mapping: blood_tests' extra 'sample_collected' state maps to
        // lab_works' 'sent' (closest equivalent — sample has left the clinic).
        // sampleCollectedAt: blood_tests stored it as datetime, lab_works as
        // date — trim down to the date portion on copy.
        await queryRunner.query(`
            INSERT INTO "lab_works" (
                "id", "clinicId", "branchId", "patientId", "orderedById", "appointmentId",
                "labName", "testName", "testDescription", "testType", "fasting",
                "status", "priority", "clinicalNotes",
                "sampleCollectedAt", "resultsReceivedAt", "patientNotifiedAt",
                "results", "resultSummary", "attachments", "externalRef", "cost",
                "invoiceId", "billedAt", "syncStatus", "createdAt", "updatedAt"
            )
            SELECT
                "id", "clinicId", "branchId", "patientId", "orderedById", "appointmentId",
                "labName", "testName", "testDescription", "testType", "fasting",
                (CASE "status" WHEN 'sample_collected' THEN 'sent' ELSE "status" END),
                "priority",
                "clinicalNotes",
                substr("sampleCollectedAt", 1, 10), "resultsReceivedAt", "patientNotifiedAt",
                "results", "resultSummary", "attachments", "externalRef", "cost",
                "invoiceId", "billedAt", "syncStatus", "createdAt", "updatedAt"
            FROM "blood_tests"
        `);

        // ── 4. Drop the now-redundant blood_tests table ─────────────────────
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_1f38789ae766851d833963377d"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_3c7e196ba71bfcc217d7831866"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_b14c89bd1a360091fee9e2d3e2"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_blood_tests_branchId"`);
        await queryRunner.query(`DROP TABLE "blood_tests"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Structural-only revert — see the postgres migration's down() for why
        // migrated rows aren't split back out of lab_works.
        await queryRunner.query(`
            CREATE TABLE "blood_tests" (
                "syncStatus" varchar(20) NOT NULL DEFAULT ('synced'),
                "id" varchar PRIMARY KEY NOT NULL,
                "clinicId" varchar NOT NULL,
                "branchId" varchar,
                "patientId" varchar NOT NULL,
                "orderedById" varchar NOT NULL,
                "appointmentId" varchar,
                "labName" varchar,
                "testType" varchar CHECK( "testType" IN ('cbc','blood_sugar','lipid_profile','lft','kft','thyroid','hba1c','blood_grouping','coagulation','electrolytes','vitamin_panel','hormone_panel','serology','other') ) NOT NULL DEFAULT ('other'),
                "testName" varchar NOT NULL,
                "testDescription" text,
                "status" varchar CHECK( "status" IN ('pending','sample_collected','in_progress','completed','cancelled') ) NOT NULL DEFAULT ('pending'),
                "priority" varchar CHECK( "priority" IN ('routine','urgent','stat') ) NOT NULL DEFAULT ('routine'),
                "fasting" boolean NOT NULL DEFAULT (0),
                "clinicalNotes" text,
                "sampleCollectedAt" datetime,
                "resultsReceivedAt" date,
                "patientNotifiedAt" datetime,
                "results" text,
                "resultSummary" text,
                "attachments" text,
                "externalRef" varchar,
                "cost" decimal(10,2),
                "invoiceId" varchar,
                "billedAt" datetime,
                "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
                "updatedAt" datetime NOT NULL DEFAULT (datetime('now'))
            )
        `);
        await queryRunner.query(`CREATE INDEX "IDX_1f38789ae766851d833963377d" ON "blood_tests" ("clinicId", "createdAt")`);
        await queryRunner.query(`CREATE INDEX "IDX_3c7e196ba71bfcc217d7831866" ON "blood_tests" ("clinicId", "status")`);
        await queryRunner.query(`CREATE INDEX "IDX_b14c89bd1a360091fee9e2d3e2" ON "blood_tests" ("clinicId", "patientId")`);
        await queryRunner.query(`CREATE INDEX "IDX_blood_tests_branchId" ON "blood_tests" ("branchId")`);

        await queryRunner.query(`ALTER TABLE "lab_works" DROP COLUMN "serviceIds"`);
        await queryRunner.query(`ALTER TABLE "lab_works" DROP COLUMN "fasting"`);
        await queryRunner.query(`ALTER TABLE "lab_works" DROP COLUMN "testType"`);

        await queryRunner.query(`DROP INDEX "IDX_lab_services_clinicId_category"`);
        await queryRunner.query(`DROP INDEX "IDX_lab_services_clinicId_isActive"`);
        await queryRunner.query(`DROP TABLE "lab_services"`);
    }
}
