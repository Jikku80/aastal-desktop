import { MigrationInterface, QueryRunner } from "typeorm";

export class AuditLogWalletEnumValue1783933938709 implements MigrationInterface {
    name = 'AuditLogWalletEnumValue1783933938709'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."audit_logs_entitytype_enum" ADD VALUE IF NOT EXISTS 'wallet'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Postgres can't drop an enum value in-place; not reversible.
    }
}