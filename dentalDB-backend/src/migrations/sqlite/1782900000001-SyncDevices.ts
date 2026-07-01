import { MigrationInterface, QueryRunner } from "typeorm";

// SQLite counterpart of ../1782900000000-SyncDevices.ts — see SyncDevice
// entity for the field docs. SQLite has no native enum type, so `status`
// falls back to a CHECK-constrained varchar here (same pattern api_keys
// uses), matching the entity's isSQLite branch.
export class SyncDevices1782900000001 implements MigrationInterface {
    name = 'SyncDevices1782900000001'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "sync_devices" ("syncStatus" varchar(20) NOT NULL DEFAULT ('synced'), "id" varchar PRIMARY KEY NOT NULL, "clinicId" varchar NOT NULL, "registeredByUserId" varchar NOT NULL, "deviceName" varchar NOT NULL, "tokenHash" varchar NOT NULL, "tokenPrefix" varchar(8) NOT NULL, "status" varchar CHECK( "status" IN ('active','revoked') ) NOT NULL DEFAULT ('active'), "lastUsedAt" datetime, "lastUsedIp" varchar, "revokedAt" datetime, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "UQ_sync_devices_tokenHash" UNIQUE ("tokenHash"))`);
        await queryRunner.query(`CREATE INDEX "IDX_sync_devices_clinicId" ON "sync_devices" ("clinicId")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_sync_devices_clinicId"`);
        await queryRunner.query(`DROP TABLE "sync_devices"`);
    }

}
