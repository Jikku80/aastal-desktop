import { MigrationInterface, QueryRunner } from "typeorm";

// SQLite/offline counterpart of 1783933938709-AuditLogWalletEnumValue
// (postgres). That migration added 'wallet' to the Postgres
// audit_logs_entitytype_enum but a matching update was never made here, so
// the local SQLite "entityType" CHECK constraint was left stuck on the
// original 12 values. Any pulled AuditLog row with entityType = 'wallet'
// (see AuditEntityType.WALLET / patient-wallet.service.ts) then fails with
// "SqliteError: CHECK constraint failed: entityType" inside pullChanges'
// single transaction, which rolls back the *entire* pull — including the
// User/Permission rows that were reconciled earlier in the same batch — so
// the mirrored account ends up with no local permissions and the app
// renders with an empty navbar after login.
//
// SQLite can't ALTER a CHECK constraint in place, so this rebuilds the
// table the same way 1782578519527-Migration.ts did, with 'wallet' added
// to the allowed entityType list.
export class AuditLogWalletEnumValue1784700000000 implements MigrationInterface {
    name = 'AuditLogWalletEnumValue1784700000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "temporary_audit_logs" ("syncStatus" varchar(20) NOT NULL DEFAULT ('synced'), "id" varchar PRIMARY KEY NOT NULL, "clinicId" varchar NOT NULL, "userId" varchar, "action" varchar CHECK( "action" IN ('created','updated','deleted','login','export','bulk') ) NOT NULL, "entityType" varchar CHECK( "entityType" IN ('invoice','patient','appointment','user','prescription','clinical_record','product','recall','auth','purchase_order','holiday','notice','wallet') ) NOT NULL, "entityId" varchar, "changes" text, "ipAddress" varchar, "userAgent" varchar, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "FK_cfa83f61e4d27a87fcae1e025ab" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE NO ACTION)`);
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
        await queryRunner.query(`CREATE TABLE "audit_logs" ("syncStatus" varchar(20) NOT NULL DEFAULT ('synced'), "id" varchar PRIMARY KEY NOT NULL, "clinicId" varchar NOT NULL, "userId" varchar, "action" varchar CHECK( "action" IN ('created','updated','deleted','login','export','bulk') ) NOT NULL, "entityType" varchar CHECK( "entityType" IN ('invoice','patient','appointment','user','prescription','clinical_record','product','recall','auth','purchase_order','holiday','notice') ) NOT NULL, "entityId" varchar, "changes" text, "ipAddress" varchar, "userAgent" varchar, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "FK_cfa83f61e4d27a87fcae1e025ab" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "audit_logs"("syncStatus", "id", "clinicId", "userId", "action", "entityType", "entityId", "changes", "ipAddress", "userAgent", "createdAt") SELECT "syncStatus", "id", "clinicId", "userId", "action", "entityType", "entityId", "changes", "ipAddress", "userAgent", "createdAt" FROM "temporary_audit_logs"`);
        await queryRunner.query(`DROP TABLE "temporary_audit_logs"`);
        await queryRunner.query(`CREATE INDEX "IDX_f93d44520fbc7e267a48d79dd5" ON "audit_logs" ("clinicId", "userId", "createdAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_fb5add00191f5790542f1d7f1d" ON "audit_logs" ("clinicId", "entityType", "createdAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_0f51c893e688797d2695563f30" ON "audit_logs" ("clinicId", "createdAt") `);
    }

}