import { MigrationInterface, QueryRunner } from "typeorm";

// Adds the columns backing the "embed Jwantra AI analysis inside
// ClinicKarobar" feature — see integrations/jwantra/entities/
// jwantra-integration.entity.ts. Same table, same online-only (Postgres)
// treatment as the original 1785300000000-JwantraIntegrations migration
// (not in database/offline-entities.ts; 'integrations' stays in
// ONLINE_ONLY_PREFIXES), so the offline desktop build is unaffected.
export class JwantraAiLink1785400000000 implements MigrationInterface {
    name = 'JwantraAiLink1785400000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "jwantra_integrations"
            ADD COLUMN "encryptedJwantraApiKey" text,
            ADD COLUMN "jwantraApiKeyPrefix" character varying(12),
            ADD COLUMN "jwantraApiKeyLinkedAt" TIMESTAMP
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "jwantra_integrations"
            DROP COLUMN "encryptedJwantraApiKey",
            DROP COLUMN "jwantraApiKeyPrefix",
            DROP COLUMN "jwantraApiKeyLinkedAt"
        `);
    }
}
