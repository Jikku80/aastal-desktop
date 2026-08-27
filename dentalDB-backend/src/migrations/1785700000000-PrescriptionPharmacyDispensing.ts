import { MigrationInterface, QueryRunner } from "typeorm";

// Phase 3 — links the existing "prescriptions" table (see
// clinical-record.entity.ts) to pharmacy inventory so a prescribed medicine
// that exists as a pharmaceutical Product can be tracked through to
// dispensing, instead of introducing a separate prescription/dispensing
// entity. All four new columns are nullable/defaulted, so existing
// free-text-only prescriptions (no productId) are unaffected.
export class PrescriptionPharmacyDispensing1785700000000 implements MigrationInterface {
    name = 'PrescriptionPharmacyDispensing1785700000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."prescriptions_dispensingstatus_enum" AS ENUM('not_dispensed', 'partially_dispensed', 'dispensed')`);
        await queryRunner.query(`
            ALTER TABLE "prescriptions"
            ADD COLUMN "productId" character varying,
            ADD COLUMN "quantityPrescribed" numeric(12,2),
            ADD COLUMN "dispensedQuantity" numeric(12,2) NOT NULL DEFAULT 0,
            ADD COLUMN "dispensingStatus" "public"."prescriptions_dispensingstatus_enum" NOT NULL DEFAULT 'not_dispensed'
        `);
        // Supports the pharmacy dispensing queue (pending prescriptions for
        // a clinic, filtered to those actually linked to inventory).
        await queryRunner.query(`CREATE INDEX "IDX_prescriptions_productId" ON "prescriptions" ("productId")`);
        await queryRunner.query(`CREATE INDEX "IDX_prescriptions_dispensingStatus" ON "prescriptions" ("dispensingStatus")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_prescriptions_dispensingStatus"`);
        await queryRunner.query(`DROP INDEX "IDX_prescriptions_productId"`);
        await queryRunner.query(`
            ALTER TABLE "prescriptions"
            DROP COLUMN "dispensingStatus",
            DROP COLUMN "dispensedQuantity",
            DROP COLUMN "quantityPrescribed",
            DROP COLUMN "productId"
        `);
        await queryRunner.query(`DROP TYPE "public"."prescriptions_dispensingstatus_enum"`);
    }
}
