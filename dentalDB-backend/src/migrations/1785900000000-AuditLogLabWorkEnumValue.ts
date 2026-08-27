import { MigrationInterface, QueryRunner } from "typeorm";

// Adds 'lab_work' to the Postgres audit_logs_entitytype_enum (Phase 7 — lab
// report PDF export gets audited the same way invoice PDF export already
// is). Bundled with 'medicine_batch': that value was added to the TS
// AuditEntityType enum back in the Phase 9/pharmacy work but a Postgres
// migration for it was apparently never written — 'medicine_batch' is
// missing from this enum on Postgres today (see the SQLite counterpart
// migration for how this was already known to be broken there too). Since
// this migration already touches the same ALTER TYPE, closing that gap
// here rather than leaving it for a future guess-and-check bug report.
export class AuditLogLabWorkEnumValue1785900000000 implements MigrationInterface {
    name = 'AuditLogLabWorkEnumValue1785900000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."audit_logs_entitytype_enum" ADD VALUE IF NOT EXISTS 'medicine_batch'`);
        await queryRunner.query(`ALTER TYPE "public"."audit_logs_entitytype_enum" ADD VALUE IF NOT EXISTS 'lab_work'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Postgres can't drop an enum value in-place; not reversible.
    }
}
