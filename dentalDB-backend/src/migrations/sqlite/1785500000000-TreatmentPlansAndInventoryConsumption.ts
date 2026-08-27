import { MigrationInterface, QueryRunner } from "typeorm";

// SQLite (offline/desktop) counterpart of
// 1785500000000-TreatmentPlansAndInventoryConsumption (Postgres) — see
// that file's comment. FK constraints kept minimal/nullable-friendly per
// this database's existing convention (RecallBranchScoping etc. — SQLite
// ADD COLUMN can't carry a FK without a full table rebuild, and new
// tables here follow the same light-touch style).
export class TreatmentPlansAndInventoryConsumption1785500000000 implements MigrationInterface {
    name = 'TreatmentPlansAndInventoryConsumption1785500000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "treatment_plan_items" ("syncStatus" varchar(20) NOT NULL DEFAULT ('synced'), "id" varchar PRIMARY KEY NOT NULL, "clinicId" varchar NOT NULL, "branchId" varchar, "patientId" varchar NOT NULL, "serviceId" varchar, "serviceName" varchar NOT NULL, "doctorId" varchar, "appointmentId" varchar, "proposedAt" datetime, "priceQuoted" decimal(10,2), "status" varchar(20) NOT NULL DEFAULT ('proposed'), "decidedAt" datetime, "note" text, "createdByUserId" varchar, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`CREATE INDEX "IDX_tpi_clinic_patient" ON "treatment_plan_items" ("clinicId", "patientId")`);
        await queryRunner.query(`CREATE INDEX "IDX_tpi_branchId" ON "treatment_plan_items" ("branchId")`);

        await queryRunner.query(`CREATE TABLE "inventory_consumption_events" ("id" varchar PRIMARY KEY NOT NULL, "clinicId" varchar NOT NULL, "branchId" varchar, "productId" varchar NOT NULL, "quantity" decimal(10,2) NOT NULL, "occurredAt" datetime NOT NULL, "reason" varchar, "appointmentId" varchar, "invoiceId" varchar, "patientId" varchar, "createdAt" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`CREATE INDEX "IDX_ice_clinic_product" ON "inventory_consumption_events" ("clinicId", "productId")`);
        await queryRunner.query(`CREATE INDEX "IDX_ice_branchId" ON "inventory_consumption_events" ("branchId")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_ice_branchId"`);
        await queryRunner.query(`DROP INDEX "IDX_ice_clinic_product"`);
        await queryRunner.query(`DROP TABLE "inventory_consumption_events"`);

        await queryRunner.query(`DROP INDEX "IDX_tpi_branchId"`);
        await queryRunner.query(`DROP INDEX "IDX_tpi_clinic_patient"`);
        await queryRunner.query(`DROP TABLE "treatment_plan_items"`);
    }
}
