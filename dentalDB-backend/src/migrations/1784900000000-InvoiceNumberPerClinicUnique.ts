import { MigrationInterface, QueryRunner } from "typeorm";

// Fixes: invoices.invoiceNumber was UNIQUE across the WHOLE table, i.e.
// across every clinic, even though BillingService.create() generates
// numbers like "INV-2026-00001" scoped to a single clinic's own count for
// the year. Any clinic with few/no invoices yet for the current year
// (brand-new signups, or an account reactivated after its free trial —
// see the "duplicate key value violates unique constraint
// UQ_bf8e0f9dd4558ef209ec111782d" errors in BillingService) would compute
// a low number that another clinic had already taken, and every attempt
// (including all 5 built-in retries) would collide on the DB constraint,
// surfacing to the user as a 400 "Could not create the invoice."
//
// Replaces the single global UNIQUE(invoiceNumber) constraint with two
// partial unique indexes:
//   - (clinicId, invoiceNumber) unique among rows where clinicId IS NOT NULL
//   - (invoiceNumber) unique among rows where clinicId IS NULL
//     (independent-doctor invoices, which have no clinic to scope to)
// See src/billing/entities/invoice.entity.ts for the matching entity change.
export class InvoiceNumberPerClinicUnique1784900000000 implements MigrationInterface {
    name = 'InvoiceNumberPerClinicUnique1784900000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "invoices" DROP CONSTRAINT "UQ_bf8e0f9dd4558ef209ec111782d"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_invoices_clinicId_invoiceNumber" ON "invoices" ("clinicId", "invoiceNumber") WHERE "clinicId" IS NOT NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_invoices_invoiceNumber_no_clinic" ON "invoices" ("invoiceNumber") WHERE "clinicId" IS NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // NOTE: this will fail if any two clinics have picked up the same
        // invoiceNumber while the partial indexes were in effect — that's
        // expected, since re-adding a global unique constraint is exactly
        // what would make that state invalid again.
        await queryRunner.query(`DROP INDEX "public"."UQ_invoices_invoiceNumber_no_clinic"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_invoices_clinicId_invoiceNumber"`);
        await queryRunner.query(`ALTER TABLE "invoices" ADD CONSTRAINT "UQ_bf8e0f9dd4558ef209ec111782d" UNIQUE ("invoiceNumber")`);
    }

}