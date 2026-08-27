import { MigrationInterface, QueryRunner } from "typeorm";

// Phase 5 — consolidates the `blood-test` module into `lab-work`, which was
// a near-duplicate of it (same results[]/patient/orderedBy/branch shape,
// same invoiceId/billedAt billing hook). Also introduces the dynamic,
// per-clinic `lab_services` catalog that replaces the old hardcoded
// `BloodTestType` enum.
//
// Existing `blood_tests` rows are copied into `lab_works` **reusing their
// original id**, so historical invoice line items that still carry a
// `bloodTestId` (kept for backward compatibility on InvoiceItem — see
// billing.service.ts) continue to resolve correctly as a `lab_works.id`
// with no remapping needed.
export class ConsolidateLabWork1785800000000 implements MigrationInterface {
    name = 'ConsolidateLabWork1785800000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // ── 1. Dynamic lab service catalog ──────────────────────────────────
        await queryRunner.query(`
            CREATE TABLE "lab_services" (
                "syncStatus" character varying(20) NOT NULL DEFAULT 'synced',
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "clinicId" character varying NOT NULL,
                "name" character varying NOT NULL,
                "category" character varying,
                "panelName" character varying,
                "defaultPrice" numeric(10,2),
                "defaultTurnaroundHours" integer,
                "defaultParameters" jsonb,
                "isActive" boolean NOT NULL DEFAULT true,
                "notes" text,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_lab_services_id" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`CREATE INDEX "IDX_lab_services_clinicId_isActive" ON "lab_services" ("clinicId", "isActive")`);
        await queryRunner.query(`CREATE INDEX "IDX_lab_services_clinicId_category" ON "lab_services" ("clinicId", "category")`);

        // ── 2. Extend lab_works to absorb blood_tests-only columns ─────────
        await queryRunner.query(`ALTER TABLE "lab_works" ADD COLUMN "testType" character varying`);
        await queryRunner.query(`ALTER TABLE "lab_works" ADD COLUMN "fasting" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "lab_works" ADD COLUMN "serviceIds" jsonb`);

        // ── 3. Migrate blood_tests rows into lab_works, id preserved ───────
        // status mapping: blood_tests' extra 'sample_collected' state maps to
        // lab_works' 'sent' (closest equivalent — sample has left the clinic).
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
                bt."id", bt."clinicId", bt."branchId", bt."patientId", bt."orderedById", bt."appointmentId",
                bt."labName", bt."testName", bt."testDescription", bt."testType"::text, bt."fasting",
                (CASE bt."status"::text
                    WHEN 'sample_collected' THEN 'sent'
                    ELSE bt."status"::text
                 END)::"public"."lab_works_status_enum",
                bt."priority"::text::"public"."lab_works_priority_enum",
                bt."clinicalNotes",
                bt."sampleCollectedAt"::date, bt."resultsReceivedAt", bt."patientNotifiedAt",
                bt."results", bt."resultSummary", bt."attachments", bt."externalRef", bt."cost",
                bt."invoiceId", bt."billedAt", bt."syncStatus", bt."createdAt", bt."updatedAt"
            FROM "blood_tests" bt
        `);

        // ── 4. Drop the now-redundant blood_tests table ─────────────────────
        await queryRunner.query(`ALTER TABLE "blood_tests" DROP CONSTRAINT IF EXISTS "FK_blood_tests_branchId"`);
        await queryRunner.query(`ALTER TABLE "blood_tests" DROP CONSTRAINT IF EXISTS "FK_2194bc34e8fa851efb57549e638"`);
        await queryRunner.query(`ALTER TABLE "blood_tests" DROP CONSTRAINT IF EXISTS "FK_353f036573ab7c5638389a09c09"`);
        await queryRunner.query(`DROP TABLE "blood_tests"`);
        await queryRunner.query(`DROP TYPE "public"."blood_tests_testtype_enum"`);
        await queryRunner.query(`DROP TYPE "public"."blood_tests_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."blood_tests_priority_enum"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Structural-only revert. Once merged, migrated blood_tests rows are
        // indistinguishable from native lab_works rows (same table, same
        // shape), so this intentionally does not attempt to split them back
        // out — recreates an empty blood_tests table so the app can still
        // boot against the old schema shape if rolled back before any new
        // data was written.
        await queryRunner.query(`CREATE TYPE "public"."blood_tests_testtype_enum" AS ENUM('cbc', 'blood_sugar', 'lipid_profile', 'lft', 'kft', 'thyroid', 'hba1c', 'blood_grouping', 'coagulation', 'electrolytes', 'vitamin_panel', 'hormone_panel', 'serology', 'other')`);
        await queryRunner.query(`CREATE TYPE "public"."blood_tests_status_enum" AS ENUM('pending', 'sample_collected', 'in_progress', 'completed', 'cancelled')`);
        await queryRunner.query(`CREATE TYPE "public"."blood_tests_priority_enum" AS ENUM('routine', 'urgent', 'stat')`);
        await queryRunner.query(`
            CREATE TABLE "blood_tests" (
                "syncStatus" character varying(20) NOT NULL DEFAULT 'synced',
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "clinicId" character varying NOT NULL,
                "branchId" character varying,
                "patientId" uuid NOT NULL,
                "orderedById" uuid NOT NULL,
                "appointmentId" character varying,
                "labName" character varying,
                "testType" "public"."blood_tests_testtype_enum" NOT NULL DEFAULT 'other',
                "testName" character varying NOT NULL,
                "testDescription" text,
                "status" "public"."blood_tests_status_enum" NOT NULL DEFAULT 'pending',
                "priority" "public"."blood_tests_priority_enum" NOT NULL DEFAULT 'routine',
                "fasting" boolean NOT NULL DEFAULT false,
                "clinicalNotes" text,
                "sampleCollectedAt" TIMESTAMP WITH TIME ZONE,
                "resultsReceivedAt" date,
                "patientNotifiedAt" TIMESTAMP WITH TIME ZONE,
                "results" jsonb,
                "resultSummary" text,
                "attachments" jsonb,
                "externalRef" character varying,
                "cost" numeric(10,2),
                "invoiceId" character varying,
                "billedAt" TIMESTAMP WITH TIME ZONE,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_5a1c4937553981a4313e819fac1" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`CREATE INDEX "IDX_1f38789ae766851d833963377d" ON "blood_tests" ("clinicId", "createdAt")`);
        await queryRunner.query(`CREATE INDEX "IDX_3c7e196ba71bfcc217d7831866" ON "blood_tests" ("clinicId", "status")`);
        await queryRunner.query(`CREATE INDEX "IDX_b14c89bd1a360091fee9e2d3e2" ON "blood_tests" ("clinicId", "patientId")`);
        await queryRunner.query(`ALTER TABLE "blood_tests" ADD CONSTRAINT "FK_2194bc34e8fa851efb57549e638" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "blood_tests" ADD CONSTRAINT "FK_353f036573ab7c5638389a09c09" FOREIGN KEY ("orderedById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);

        await queryRunner.query(`ALTER TABLE "lab_works" DROP COLUMN "serviceIds"`);
        await queryRunner.query(`ALTER TABLE "lab_works" DROP COLUMN "fasting"`);
        await queryRunner.query(`ALTER TABLE "lab_works" DROP COLUMN "testType"`);

        await queryRunner.query(`DROP INDEX "IDX_lab_services_clinicId_category"`);
        await queryRunner.query(`DROP INDEX "IDX_lab_services_clinicId_isActive"`);
        await queryRunner.query(`DROP TABLE "lab_services"`);
    }
}
