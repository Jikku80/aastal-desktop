import { MigrationInterface, QueryRunner } from "typeorm";

// SQLite (offline/desktop) counterpart of 1785600000000-PharmacyPackage
// (Postgres) — see that file's comment. Enum-typed columns become plain
// varchar here (same convention as every other isSQLite-conditioned entity
// in this codebase, e.g. Product/PurchaseOrder/MedicineBatch). New tables
// keep FK columns nullable/unconstrained per this database's existing
// light-touch convention (RecallBranchScoping, TreatmentPlansAndInventoryConsumption, etc.) —
// SQLite ADD COLUMN can't carry a FK without a full table rebuild.
export class PharmacyPackage1785600000000 implements MigrationInterface {
    name = 'PharmacyPackage1785600000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // ── products: pharma classification & attributes ──────────────────
        await queryRunner.query(`ALTER TABLE "products" ADD COLUMN "itemType" varchar NOT NULL DEFAULT ('general')`);
        await queryRunner.query(`ALTER TABLE "products" ADD COLUMN "genericName" varchar`);
        await queryRunner.query(`ALTER TABLE "products" ADD COLUMN "brandName" varchar`);
        await queryRunner.query(`ALTER TABLE "products" ADD COLUMN "medicineCategory" varchar`);
        await queryRunner.query(`ALTER TABLE "products" ADD COLUMN "dosageForm" varchar`);
        await queryRunner.query(`ALTER TABLE "products" ADD COLUMN "strength" varchar`);
        await queryRunner.query(`ALTER TABLE "products" ADD COLUMN "dosageUnit" varchar`);
        await queryRunner.query(`ALTER TABLE "products" ADD COLUMN "manufacturer" varchar`);
        await queryRunner.query(`ALTER TABLE "products" ADD COLUMN "storageInstructions" text`);
        await queryRunner.query(`ALTER TABLE "products" ADD COLUMN "prescriptionRequired" boolean NOT NULL DEFAULT (0)`);
        await queryRunner.query(`ALTER TABLE "products" ADD COLUMN "isControlled" boolean NOT NULL DEFAULT (0)`);
        await queryRunner.query(`ALTER TABLE "products" ADD COLUMN "barcode" varchar`);
        await queryRunner.query(`CREATE INDEX "IDX_products_clinic_itemType" ON "products" ("clinicId", "itemType")`);

        // ── medicine_batches ────────────────────────────────────────────────
        await queryRunner.query(`CREATE TABLE "medicine_batches" ("id" varchar PRIMARY KEY NOT NULL, "clinicId" varchar NOT NULL, "branchId" varchar, "productId" varchar NOT NULL, "batchNumber" varchar NOT NULL, "manufacturingDate" date, "startDate" date NOT NULL, "expiryDate" date NOT NULL, "quantityReceived" decimal(12,2) NOT NULL, "quantityAvailable" decimal(12,2) NOT NULL, "purchaseOrderId" varchar, "supplierName" varchar, "vendorId" varchar, "purchaseCost" decimal(12,2), "sellingPrice" decimal(12,2), "status" varchar NOT NULL DEFAULT ('not_available'), "createdByUserId" varchar, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "UQ_medicine_batches_clinic_product_batch" UNIQUE ("clinicId", "productId", "batchNumber"))`);
        await queryRunner.query(`CREATE INDEX "IDX_mb_clinic_product" ON "medicine_batches" ("clinicId", "productId")`);
        await queryRunner.query(`CREATE INDEX "IDX_mb_branchId" ON "medicine_batches" ("branchId")`);
        await queryRunner.query(`CREATE INDEX "IDX_mb_clinic_status" ON "medicine_batches" ("clinicId", "status")`);
        await queryRunner.query(`CREATE INDEX "IDX_mb_clinic_expiry" ON "medicine_batches" ("clinicId", "expiryDate")`);

        // ── pharmacy_batch_notification_log ────────────────────────────────
        await queryRunner.query(`CREATE TABLE "pharmacy_batch_notification_log" ("id" varchar PRIMARY KEY NOT NULL, "clinicId" varchar NOT NULL, "batchId" varchar NOT NULL, "eventType" varchar NOT NULL, "thresholdDays" integer, "sentAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "UQ_pbnl_clinic_batch_event_threshold" UNIQUE ("clinicId", "batchId", "eventType", "thresholdDays"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "pharmacy_batch_notification_log"`);

        await queryRunner.query(`DROP INDEX "IDX_mb_clinic_expiry"`);
        await queryRunner.query(`DROP INDEX "IDX_mb_clinic_status"`);
        await queryRunner.query(`DROP INDEX "IDX_mb_branchId"`);
        await queryRunner.query(`DROP INDEX "IDX_mb_clinic_product"`);
        await queryRunner.query(`DROP TABLE "medicine_batches"`);

        await queryRunner.query(`DROP INDEX "IDX_products_clinic_itemType"`);
        // SQLite has no DROP COLUMN pre-3.35 support in older typeorm driver paths —
        // left as a no-op here, consistent with this codebase's other SQLite
        // migrations (columns are simply left unused going forward).
    }
}
