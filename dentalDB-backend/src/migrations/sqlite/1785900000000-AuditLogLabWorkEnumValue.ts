import { MigrationInterface, QueryRunner } from "typeorm";

// SQLite/offline counterpart of 1785900000000-AuditLogLabWorkEnumValue
// (postgres). Rebuilds the audit_logs table the same way
// 1784700000000-AuditLogWalletEnumValue.ts did, this time adding BOTH
// 'medicine_batch' and 'lab_work' to the CHECK constraint.
//
// 'medicine_batch' is not new here — pharmacy.service.ts has been writing
// AuditEntityType.MEDICINE_BATCH audit logs since the Phase 9 pharmacy
// work, but the matching SQLite CHECK update was missed at the time (only
// the Postgres enum type was updated, or possibly neither — see the
// Postgres counterpart's comment). On SQLite this means every pharmacy
// batch create/update/delete/dispense audit log has been failing its
// CHECK constraint and rolling back the surrounding transaction — the same
// failure mode the 1784700000000 migration's comment describes for
// 'wallet'. Fixing it here since this migration already rebuilds the same
// table for 'lab_work' (Phase 7 lab report PDF export auditing).
export class AuditLogLabWorkEnumValue1785900000000 implements MigrationInterface {
    name = 'AuditLogLabWorkEnumValue1785900000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "temporary_audit_logs" ("syncStatus" varchar(20) NOT NULL DEFAULT ('synced'), "id" varchar PRIMARY KEY NOT NULL, "clinicId" varchar NOT NULL, "userId" varchar, "action" varchar CHECK( "action" IN ('created','updated','deleted','login','export','bulk') ) NOT NULL, "entityType" varchar CHECK( "entityType" IN ('invoice','patient','appointment','user','prescription','clinical_record','product','recall','auth','purchase_order','holiday','notice','wallet','medicine_batch','lab_work') ) NOT NULL, "entityId" varchar, "changes" text, "ipAddress" varchar, "userAgent" varchar, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "FK_cfa83f61e4d27a87fcae1e025ab" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_audit_logs"("syncStatus", "id", "clinicId", "userId", "action", "entityType", "entityId", "changes", "ipAddress", "userAgent", "createdAt") SELECT "syncStatus", "id", "clinicId", "userId", "action", "entityType", "entityId", "changes", "ipAddress", "userAgent", "createdAt" FROM "audit_logs"`);
        await queryRunner.query(`DROP TABLE "audit_logs"`);
        await queryRunner.query(`ALTER TABLE "temporary_audit_logs" RENAME TO "audit_logs"`);
        await queryRunner.query(`CREATE INDEX "IDX_f93d44520fbc7e267a48d79dd5" ON "audit_logs" ("clinicId", "userId", "createdAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_fb5add00191f5790542f1d7f1d" ON "audit_logs" ("clinicId", "entityType", "createdAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_0f51c893e688797d2695563f30" ON "audit_logs" ("clinicId", "createdAt") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_0f51c893e688797d2695563f30"`);
        await queryRunner.query(`DROP INDEX "IDX_fb5add00191f5790542f1d7f1d"`);
        await queryRunner.query(`DROP INDEX "IDX_f93d44520fbc7e267a48d79dd5"`);
        await queryRunner.query(`ALTER TABLE "audit_logs" RENAME TO "temporary_audit_logs"`);
        await queryRunner.query(`CREATE TABLE "audit_logs" ("syncStatus" varchar(20) NOT NULL DEFAULT ('synced'), "id" varchar PRIMARY KEY NOT NULL, "clinicId" varchar NOT NULL, "userId" varchar, "action" varchar CHECK( "action" IN ('created','updated','deleted','login','export','bulk') ) NOT NULL, "entityType" varchar CHECK( "entityType" IN ('invoice','patient','appointment','user','prescription','clinical_record','product','recall','auth','purchase_order','holiday','notice','wallet') ) NOT NULL, "entityId" varchar, "changes" text, "ipAddress" varchar, "userAgent" varchar, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "FK_cfa83f61e4d27a87fcae1e025ab" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "audit_logs"("syncStatus", "id", "clinicId", "userId", "action", "entityType", "entityId", "changes", "ipAddress", "userAgent", "createdAt") SELECT "syncStatus", "id", "clinicId", "userId", "action", "entityType", "entityId", "changes", "ipAddress", "userAgent", "createdAt" FROM "temporary_audit_logs"`);
        await queryRunner.query(`DROP TABLE "temporary_audit_logs"`);
        await queryRunner.query(`CREATE INDEX "IDX_f93d44520fbc7e267a48d79dd5" ON "audit_logs" ("clinicId", "userId", "createdAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_fb5add00191f5790542f1d7f1d" ON "audit_logs" ("clinicId", "entityType", "createdAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_0f51c893e688797d2695563f30" ON "audit_logs" ("clinicId", "createdAt") `);
    }

}
