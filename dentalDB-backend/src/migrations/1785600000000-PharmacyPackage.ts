import { MigrationInterface, QueryRunner } from "typeorm";

// Adds the Pharmaceutical / Pharmacy Management Package (see project spec)
// on top of the existing inventory system:
//   1) Pharma classification/attribute columns on the existing "products"
//      table (itemType defaults to 'general' — zero behavior change for
//      existing rows).
//   2) "medicine_batches" — batch/lot-level expiry & FEFO tracking,
//      referencing products.id. Stock totals stay owned by
//      products.stockQuantity via the existing InventoryService.adjustStock;
//      this table only carries the per-lot breakdown.
//   3) "pharmacy_batch_notification_log" — dedupe table so the (future)
//      expiry/start-date scheduler never re-sends the same threshold
//      notification for the same batch.
export class PharmacyPackage1785600000000 implements MigrationInterface {
    name = 'PharmacyPackage1785600000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // ── products: pharma classification & attributes ──────────────────
        await queryRunner.query(`CREATE TYPE "public"."products_itemtype_enum" AS ENUM('general', 'pharmaceutical', 'medical_supply', 'consumable')`);
        await queryRunner.query(`CREATE TYPE "public"."products_dosageform_enum" AS ENUM('tablet', 'capsule', 'syrup', 'injection', 'cream', 'ointment', 'drops', 'other')`);
        await queryRunner.query(`
            ALTER TABLE "products"
            ADD COLUMN "itemType" "public"."products_itemtype_enum" NOT NULL DEFAULT 'general',
            ADD COLUMN "genericName" character varying,
            ADD COLUMN "brandName" character varying,
            ADD COLUMN "medicineCategory" character varying,
            ADD COLUMN "dosageForm" "public"."products_dosageform_enum",
            ADD COLUMN "strength" character varying,
            ADD COLUMN "dosageUnit" character varying,
            ADD COLUMN "manufacturer" character varying,
            ADD COLUMN "storageInstructions" text,
            ADD COLUMN "prescriptionRequired" boolean NOT NULL DEFAULT false,
            ADD COLUMN "isControlled" boolean NOT NULL DEFAULT false,
            ADD COLUMN "barcode" character varying
        `);
        await queryRunner.query(`CREATE INDEX "IDX_products_clinic_itemType" ON "products" ("clinicId", "itemType")`);

        // ── medicine_batches ────────────────────────────────────────────────
        await queryRunner.query(`CREATE TYPE "public"."medicine_batches_status_enum" AS ENUM('not_available', 'active', 'expiring_soon', 'expired', 'depleted')`);
        await queryRunner.query(`
            CREATE TABLE "medicine_batches" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "clinicId" character varying NOT NULL,
                "branchId" uuid,
                "productId" uuid NOT NULL,
                "batchNumber" character varying NOT NULL,
                "manufacturingDate" date,
                "startDate" date NOT NULL,
                "expiryDate" date NOT NULL,
                "quantityReceived" numeric(12,2) NOT NULL,
                "quantityAvailable" numeric(12,2) NOT NULL,
                "purchaseOrderId" character varying,
                "supplierName" character varying,
                "vendorId" character varying,
                "purchaseCost" numeric(12,2),
                "sellingPrice" numeric(12,2),
                "status" "public"."medicine_batches_status_enum" NOT NULL DEFAULT 'not_available',
                "createdByUserId" character varying,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_medicine_batches_id" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_medicine_batches_clinic_product_batch" UNIQUE ("clinicId", "productId", "batchNumber")
            )
        `);
        await queryRunner.query(`
            ALTER TABLE "medicine_batches"
            ADD CONSTRAINT "FK_mb_branchId" FOREIGN KEY ("branchId")
            REFERENCES "branches"("id") ON DELETE SET NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "medicine_batches"
            ADD CONSTRAINT "FK_mb_productId" FOREIGN KEY ("productId")
            REFERENCES "products"("id") ON DELETE CASCADE
        `);
        await queryRunner.query(`CREATE INDEX "IDX_mb_clinic_product" ON "medicine_batches" ("clinicId", "productId")`);
        await queryRunner.query(`CREATE INDEX "IDX_mb_branchId" ON "medicine_batches" ("branchId")`);
        await queryRunner.query(`CREATE INDEX "IDX_mb_clinic_status" ON "medicine_batches" ("clinicId", "status")`);
        await queryRunner.query(`CREATE INDEX "IDX_mb_clinic_expiry" ON "medicine_batches" ("clinicId", "expiryDate")`);

        // ── pharmacy_batch_notification_log ────────────────────────────────
        await queryRunner.query(`
            CREATE TABLE "pharmacy_batch_notification_log" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "clinicId" character varying NOT NULL,
                "batchId" character varying NOT NULL,
                "eventType" character varying NOT NULL,
                "thresholdDays" integer,
                "sentAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_pharmacy_batch_notification_log_id" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_pbnl_clinic_batch_event_threshold" UNIQUE ("clinicId", "batchId", "eventType", "thresholdDays")
            )
        `);

        // ── audit_logs.entityType enum: add 'medicine_batch' ────────────────
        await queryRunner.query(`ALTER TYPE "public"."audit_logs_entitytype_enum" ADD VALUE IF NOT EXISTS 'medicine_batch'`);

        // ── notifications.type enum: add pharma event types ─────────────────
        await queryRunner.query(`ALTER TYPE "public"."notifications_type_enum" ADD VALUE IF NOT EXISTS 'medicine_batch_expiring'`);
        await queryRunner.query(`ALTER TYPE "public"."notifications_type_enum" ADD VALUE IF NOT EXISTS 'medicine_batch_expired'`);
        await queryRunner.query(`ALTER TYPE "public"."notifications_type_enum" ADD VALUE IF NOT EXISTS 'medicine_batch_available'`);
        await queryRunner.query(`ALTER TYPE "public"."notifications_type_enum" ADD VALUE IF NOT EXISTS 'medicine_batch_start_date_reached'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Postgres can't drop a single enum value — no-op for the four ALTER
        // TYPE ADD VALUE statements above (same convention already used by
        // AuditLogWalletEnumValue1783933938709 elsewhere in this codebase).

        await queryRunner.query(`DROP TABLE "pharmacy_batch_notification_log"`);

        await queryRunner.query(`DROP INDEX "IDX_mb_clinic_expiry"`);
        await queryRunner.query(`DROP INDEX "IDX_mb_clinic_status"`);
        await queryRunner.query(`DROP INDEX "IDX_mb_branchId"`);
        await queryRunner.query(`DROP INDEX "IDX_mb_clinic_product"`);
        await queryRunner.query(`ALTER TABLE "medicine_batches" DROP CONSTRAINT "FK_mb_productId"`);
        await queryRunner.query(`ALTER TABLE "medicine_batches" DROP CONSTRAINT "FK_mb_branchId"`);
        await queryRunner.query(`DROP TABLE "medicine_batches"`);
        await queryRunner.query(`DROP TYPE "public"."medicine_batches_status_enum"`);

        await queryRunner.query(`DROP INDEX "IDX_products_clinic_itemType"`);
        await queryRunner.query(`
            ALTER TABLE "products"
            DROP COLUMN "itemType",
            DROP COLUMN "genericName",
            DROP COLUMN "brandName",
            DROP COLUMN "medicineCategory",
            DROP COLUMN "dosageForm",
            DROP COLUMN "strength",
            DROP COLUMN "dosageUnit",
            DROP COLUMN "manufacturer",
            DROP COLUMN "storageInstructions",
            DROP COLUMN "prescriptionRequired",
            DROP COLUMN "isControlled",
            DROP COLUMN "barcode"
        `);
        await queryRunner.query(`DROP TYPE "public"."products_dosageform_enum"`);
        await queryRunner.query(`DROP TYPE "public"."products_itemtype_enum"`);
    }
}
