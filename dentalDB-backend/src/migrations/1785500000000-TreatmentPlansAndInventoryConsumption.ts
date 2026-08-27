import { MigrationInterface, QueryRunner } from "typeorm";

// Creates treatment_plan_items (structured treatment proposals, distinct
// from clinical_records.treatmentPlan's free-text field — see
// treatment-plans/entities/treatment-plan-item.entity.ts) and
// inventory_consumption_events (one row per stock-decrement event, logged
// by InventoryService.adjustStock() — see
// inventory/entities/inventory-consumption.entity.ts). Both exist to
// close the two remaining gaps in the Jwantra Phase 7 sync: treatment
// plans and inventory consumption previously had no ClinicKarobar-side
// data to sync at all.
export class TreatmentPlansAndInventoryConsumption1785500000000 implements MigrationInterface {
    name = 'TreatmentPlansAndInventoryConsumption1785500000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "treatment_plan_items" (
                "syncStatus" character varying(20) NOT NULL DEFAULT 'synced',
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "clinicId" character varying NOT NULL,
                "branchId" uuid,
                "patientId" uuid NOT NULL,
                "serviceId" uuid,
                "serviceName" character varying NOT NULL,
                "doctorId" uuid,
                "appointmentId" uuid,
                "proposedAt" TIMESTAMP WITH TIME ZONE,
                "priceQuoted" numeric(10,2),
                "status" character varying(20) NOT NULL DEFAULT 'proposed',
                "decidedAt" TIMESTAMP WITH TIME ZONE,
                "note" text,
                "createdByUserId" uuid,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_treatment_plan_items_id" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            ALTER TABLE "treatment_plan_items"
            ADD CONSTRAINT "FK_tpi_branchId" FOREIGN KEY ("branchId")
            REFERENCES "branches"("id") ON DELETE SET NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "treatment_plan_items"
            ADD CONSTRAINT "FK_tpi_patientId" FOREIGN KEY ("patientId")
            REFERENCES "patients"("id") ON DELETE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "treatment_plan_items"
            ADD CONSTRAINT "FK_tpi_serviceId" FOREIGN KEY ("serviceId")
            REFERENCES "clinic_services"("id") ON DELETE SET NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "treatment_plan_items"
            ADD CONSTRAINT "FK_tpi_appointmentId" FOREIGN KEY ("appointmentId")
            REFERENCES "appointments"("id") ON DELETE SET NULL
        `);
        await queryRunner.query(`CREATE INDEX "IDX_tpi_clinic_patient" ON "treatment_plan_items" ("clinicId", "patientId")`);
        await queryRunner.query(`CREATE INDEX "IDX_tpi_branchId" ON "treatment_plan_items" ("branchId")`);

        await queryRunner.query(`
            CREATE TABLE "inventory_consumption_events" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "clinicId" character varying NOT NULL,
                "branchId" uuid,
                "productId" uuid NOT NULL,
                "quantity" numeric(10,2) NOT NULL,
                "occurredAt" TIMESTAMP WITH TIME ZONE NOT NULL,
                "reason" character varying,
                "appointmentId" uuid,
                "invoiceId" uuid,
                "patientId" uuid,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_inventory_consumption_events_id" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            ALTER TABLE "inventory_consumption_events"
            ADD CONSTRAINT "FK_ice_branchId" FOREIGN KEY ("branchId")
            REFERENCES "branches"("id") ON DELETE SET NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "inventory_consumption_events"
            ADD CONSTRAINT "FK_ice_productId" FOREIGN KEY ("productId")
            REFERENCES "products"("id") ON DELETE CASCADE
        `);
        await queryRunner.query(`CREATE INDEX "IDX_ice_clinic_product" ON "inventory_consumption_events" ("clinicId", "productId")`);
        await queryRunner.query(`CREATE INDEX "IDX_ice_branchId" ON "inventory_consumption_events" ("branchId")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_ice_branchId"`);
        await queryRunner.query(`DROP INDEX "IDX_ice_clinic_product"`);
        await queryRunner.query(`ALTER TABLE "inventory_consumption_events" DROP CONSTRAINT "FK_ice_productId"`);
        await queryRunner.query(`ALTER TABLE "inventory_consumption_events" DROP CONSTRAINT "FK_ice_branchId"`);
        await queryRunner.query(`DROP TABLE "inventory_consumption_events"`);

        await queryRunner.query(`DROP INDEX "IDX_tpi_branchId"`);
        await queryRunner.query(`DROP INDEX "IDX_tpi_clinic_patient"`);
        await queryRunner.query(`ALTER TABLE "treatment_plan_items" DROP CONSTRAINT "FK_tpi_appointmentId"`);
        await queryRunner.query(`ALTER TABLE "treatment_plan_items" DROP CONSTRAINT "FK_tpi_serviceId"`);
        await queryRunner.query(`ALTER TABLE "treatment_plan_items" DROP CONSTRAINT "FK_tpi_patientId"`);
        await queryRunner.query(`ALTER TABLE "treatment_plan_items" DROP CONSTRAINT "FK_tpi_branchId"`);
        await queryRunner.query(`DROP TABLE "treatment_plan_items"`);
    }
}
