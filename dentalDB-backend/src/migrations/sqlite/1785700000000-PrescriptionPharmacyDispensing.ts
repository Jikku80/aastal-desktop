import { MigrationInterface, QueryRunner } from "typeorm";

// SQLite (offline/desktop) counterpart of
// 1785700000000-PrescriptionPharmacyDispensing (Postgres) — see that
// file's comment. dispensingStatus becomes a plain varchar, same
// convention as every other isSQLite-conditioned enum column in this
// codebase (MedicineBatch.status, Product.itemType, etc.).
export class PrescriptionPharmacyDispensing1785700000000 implements MigrationInterface {
    name = 'PrescriptionPharmacyDispensing1785700000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "prescriptions" ADD COLUMN "productId" varchar`);
        await queryRunner.query(`ALTER TABLE "prescriptions" ADD COLUMN "quantityPrescribed" decimal(12,2)`);
        await queryRunner.query(`ALTER TABLE "prescriptions" ADD COLUMN "dispensedQuantity" decimal(12,2) NOT NULL DEFAULT (0)`);
        await queryRunner.query(`ALTER TABLE "prescriptions" ADD COLUMN "dispensingStatus" varchar NOT NULL DEFAULT ('not_dispensed')`);
        await queryRunner.query(`CREATE INDEX "IDX_prescriptions_productId" ON "prescriptions" ("productId")`);
        await queryRunner.query(`CREATE INDEX "IDX_prescriptions_dispensingStatus" ON "prescriptions" ("dispensingStatus")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_prescriptions_dispensingStatus"`);
        await queryRunner.query(`DROP INDEX "IDX_prescriptions_productId"`);
        // SQLite has no DROP COLUMN pre-3.35 support in older typeorm driver
        // paths — left as a no-op here, consistent with this codebase's
        // other SQLite migrations (columns are simply left unused going forward).
    }
}
