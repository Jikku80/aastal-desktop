import { MigrationInterface, QueryRunner } from "typeorm";

// SQLite/offline counterpart of 1784900000000-InvoiceNumberPerClinicUnique
// (postgres). SQLite can't drop a named table constraint with ALTER TABLE,
// so this rebuilds "invoices" without the inline UNIQUE("invoiceNumber")
// constraint (same rebuild pattern used elsewhere in this migration set —
// see 1782578519527-Migration.ts), keeping every other column/constraint
// identical, then adds the same two partial unique indexes as the postgres
// migration (SQLite has supported partial indexes since 3.8.0, and the
// better-sqlite3 driver here is well past that).
export class InvoiceNumberPerClinicUnique1784900000000 implements MigrationInterface {
    name = 'InvoiceNumberPerClinicUnique1784900000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_aa113be7823bb2b7297f7e7974"`);
        await queryRunner.query(`DROP INDEX "IDX_50b03ae01dff60fe72f19c88e7"`);
        await queryRunner.query(`CREATE TABLE "temporary_invoices" ("syncStatus" varchar(20) NOT NULL DEFAULT ('synced'), "id" varchar PRIMARY KEY NOT NULL, "invoiceUuid" varchar NOT NULL, "clinicId" varchar, "branchId" varchar, "invoiceNumber" varchar NOT NULL, "patientId" varchar NOT NULL, "appointmentId" varchar, "items" text NOT NULL, "subtotal" decimal(10,2) NOT NULL DEFAULT (0), "taxPercent" decimal(5,2) NOT NULL DEFAULT (0), "taxAmount" decimal(10,2) NOT NULL DEFAULT (0), "vatPercent" decimal(5,2) NOT NULL DEFAULT (0), "vatAmount" decimal(10,2) NOT NULL DEFAULT (0), "vatNumber" varchar, "discountAmount" decimal(10,2) NOT NULL DEFAULT (0), "total" decimal(10,2) NOT NULL, "paidAmount" decimal(10,2) NOT NULL DEFAULT (0), "dueAmount" decimal(10,2) NOT NULL DEFAULT (0), "status" varchar CHECK( "status" IN ('draft','sent','paid','partially_paid','not_yet_paid','overdue','cancelled','refunded') ) NOT NULL DEFAULT ('draft'), "paymentMethod" varchar CHECK( "paymentMethod" IN ('cash','esewa','khalti','paypal','bank_transfer','insurance','wallet_credit','wallet_debit') ), "paymentTransactionId" varchar, "paidAt" datetime, "dueDate" datetime, "notes" varchar, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "UQ_9bebf88fb9eeaaea3e6a46795f0" UNIQUE ("invoiceUuid"), CONSTRAINT "FK_1e60c34407bf8d83ae612cc079d" FOREIGN KEY ("branchId") REFERENCES "branches" ("id") ON DELETE SET NULL ON UPDATE NO ACTION, CONSTRAINT "FK_7f1f96ee217edce59c605cc9380" FOREIGN KEY ("patientId") REFERENCES "patients" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION, CONSTRAINT "FK_c38619b9c5659db0a6cef729b38" FOREIGN KEY ("appointmentId") REFERENCES "appointments" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_invoices"("syncStatus", "id", "invoiceUuid", "clinicId", "branchId", "invoiceNumber", "patientId", "appointmentId", "items", "subtotal", "taxPercent", "taxAmount", "vatPercent", "vatAmount", "vatNumber", "discountAmount", "total", "paidAmount", "dueAmount", "status", "paymentMethod", "paymentTransactionId", "paidAt", "dueDate", "notes", "createdAt", "updatedAt") SELECT "syncStatus", "id", "invoiceUuid", "clinicId", "branchId", "invoiceNumber", "patientId", "appointmentId", "items", "subtotal", "taxPercent", "taxAmount", "vatPercent", "vatAmount", "vatNumber", "discountAmount", "total", "paidAmount", "dueAmount", "status", "paymentMethod", "paymentTransactionId", "paidAt", "dueDate", "notes", "createdAt", "updatedAt" FROM "invoices"`);
        await queryRunner.query(`DROP TABLE "invoices"`);
        await queryRunner.query(`ALTER TABLE "temporary_invoices" RENAME TO "invoices"`);
        await queryRunner.query(`CREATE INDEX "IDX_aa113be7823bb2b7297f7e7974" ON "invoices" ("branchId", "status") `);
        await queryRunner.query(`CREATE INDEX "IDX_50b03ae01dff60fe72f19c88e7" ON "invoices" ("clinicId", "status") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_invoices_clinicId_invoiceNumber" ON "invoices" ("clinicId", "invoiceNumber") WHERE "clinicId" IS NOT NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_invoices_invoiceNumber_no_clinic" ON "invoices" ("invoiceNumber") WHERE "clinicId" IS NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "UQ_invoices_invoiceNumber_no_clinic"`);
        await queryRunner.query(`DROP INDEX "UQ_invoices_clinicId_invoiceNumber"`);
        await queryRunner.query(`DROP INDEX "IDX_50b03ae01dff60fe72f19c88e7"`);
        await queryRunner.query(`DROP INDEX "IDX_aa113be7823bb2b7297f7e7974"`);
        await queryRunner.query(`CREATE TABLE "temporary_invoices" ("syncStatus" varchar(20) NOT NULL DEFAULT ('synced'), "id" varchar PRIMARY KEY NOT NULL, "invoiceUuid" varchar NOT NULL, "clinicId" varchar, "branchId" varchar, "invoiceNumber" varchar NOT NULL, "patientId" varchar NOT NULL, "appointmentId" varchar, "items" text NOT NULL, "subtotal" decimal(10,2) NOT NULL DEFAULT (0), "taxPercent" decimal(5,2) NOT NULL DEFAULT (0), "taxAmount" decimal(10,2) NOT NULL DEFAULT (0), "vatPercent" decimal(5,2) NOT NULL DEFAULT (0), "vatAmount" decimal(10,2) NOT NULL DEFAULT (0), "vatNumber" varchar, "discountAmount" decimal(10,2) NOT NULL DEFAULT (0), "total" decimal(10,2) NOT NULL, "paidAmount" decimal(10,2) NOT NULL DEFAULT (0), "dueAmount" decimal(10,2) NOT NULL DEFAULT (0), "status" varchar CHECK( "status" IN ('draft','sent','paid','partially_paid','not_yet_paid','overdue','cancelled','refunded') ) NOT NULL DEFAULT ('draft'), "paymentMethod" varchar CHECK( "paymentMethod" IN ('cash','esewa','khalti','paypal','bank_transfer','insurance','wallet_credit','wallet_debit') ), "paymentTransactionId" varchar, "paidAt" datetime, "dueDate" datetime, "notes" varchar, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "UQ_9bebf88fb9eeaaea3e6a46795f0" UNIQUE ("invoiceUuid"), CONSTRAINT "UQ_bf8e0f9dd4558ef209ec111782d" UNIQUE ("invoiceNumber"), CONSTRAINT "FK_1e60c34407bf8d83ae612cc079d" FOREIGN KEY ("branchId") REFERENCES "branches" ("id") ON DELETE SET NULL ON UPDATE NO ACTION, CONSTRAINT "FK_7f1f96ee217edce59c605cc9380" FOREIGN KEY ("patientId") REFERENCES "patients" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION, CONSTRAINT "FK_c38619b9c5659db0a6cef729b38" FOREIGN KEY ("appointmentId") REFERENCES "appointments" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_invoices"("syncStatus", "id", "invoiceUuid", "clinicId", "branchId", "invoiceNumber", "patientId", "appointmentId", "items", "subtotal", "taxPercent", "taxAmount", "vatPercent", "vatAmount", "vatNumber", "discountAmount", "total", "paidAmount", "dueAmount", "status", "paymentMethod", "paymentTransactionId", "paidAt", "dueDate", "notes", "createdAt", "updatedAt") SELECT "syncStatus", "id", "invoiceUuid", "clinicId", "branchId", "invoiceNumber", "patientId", "appointmentId", "items", "subtotal", "taxPercent", "taxAmount", "vatPercent", "vatAmount", "vatNumber", "discountAmount", "total", "paidAmount", "dueAmount", "status", "paymentMethod", "paymentTransactionId", "paidAt", "dueDate", "notes", "createdAt", "updatedAt" FROM "invoices"`);
        await queryRunner.query(`DROP TABLE "invoices"`);
        await queryRunner.query(`ALTER TABLE "temporary_invoices" RENAME TO "invoices"`);
        await queryRunner.query(`CREATE INDEX "IDX_aa113be7823bb2b7297f7e7974" ON "invoices" ("branchId", "status") `);
        await queryRunner.query(`CREATE INDEX "IDX_50b03ae01dff60fe72f19c88e7" ON "invoices" ("clinicId", "status") `);
    }

}