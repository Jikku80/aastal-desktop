import { MigrationInterface, QueryRunner } from "typeorm";

// Backs SyncDevice (src/sync/entities/sync-device.entity.ts) — one row per
// desktop install that has completed automatic sync registration (see
// SyncDevicesService.registerDevice, called from POST /sync/register-device).
// Replaces the old SYNC_SHARED_SECRET shared-secret model.
export class SyncDevices1782900000000 implements MigrationInterface {
    name = 'SyncDevices1782900000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."sync_devices_status_enum" AS ENUM('active', 'revoked')`);
        await queryRunner.query(`CREATE TABLE "sync_devices" ("syncStatus" character varying(20) NOT NULL DEFAULT 'synced', "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "clinicId" character varying NOT NULL, "registeredByUserId" character varying NOT NULL, "deviceName" character varying NOT NULL, "tokenHash" character varying NOT NULL, "tokenPrefix" character varying(8) NOT NULL, "status" "public"."sync_devices_status_enum" NOT NULL DEFAULT 'active', "lastUsedAt" TIMESTAMP, "lastUsedIp" character varying, "revokedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_sync_devices_tokenHash" UNIQUE ("tokenHash"), CONSTRAINT "PK_sync_devices_id" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_sync_devices_clinicId" ON "sync_devices" ("clinicId")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_sync_devices_clinicId"`);
        await queryRunner.query(`DROP TABLE "sync_devices"`);
        await queryRunner.query(`DROP TYPE "public"."sync_devices_status_enum"`);
    }

}
