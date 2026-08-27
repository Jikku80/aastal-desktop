import { MigrationInterface, QueryRunner } from "typeorm";

// Creates jwantra_integrations — see
// integrations/jwantra/entities/jwantra-integration.entity.ts.
// Online-only (Postgres) table, same as api_keys/subscriptions/etc: not
// registered in database/offline-entities.ts, and 'integrations' is in
// ONLINE_ONLY_PREFIXES (see database/online-only-gate.middleware.ts) so the
// offline desktop build never routes here at all.
export class JwantraIntegrations1785300000000 implements MigrationInterface {
    name = 'JwantraIntegrations1785300000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "jwantra_integrations" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "clinicId" character varying NOT NULL,
                "tokenHash" character varying NOT NULL,
                "tokenPrefix" character varying(8) NOT NULL,
                "status" character varying(20) NOT NULL DEFAULT 'active',
                "webhookUrl" character varying,
                "encryptedWebhookSecret" text,
                "lastUsedAt" TIMESTAMP,
                "requestCount" integer NOT NULL DEFAULT '0',
                "lastWebhookDispatchAt" TIMESTAMP,
                "lastWebhookError" character varying,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_jwantra_integrations_tokenHash" UNIQUE ("tokenHash"),
                CONSTRAINT "UQ_jwantra_integrations_clinicId" UNIQUE ("clinicId"),
                CONSTRAINT "PK_jwantra_integrations_id" PRIMARY KEY ("id")
            )
        `);
        // NOTE: no FK to "clinics" here, deliberately matching api_keys —
        // clinicId is stored as character varying (TypeORM's default for a
        // plain `string` column) while clinics.id is uuid, so a real FK
        // would need an explicit cast. Same tradeoff already accepted for
        // api_keys.clinicId elsewhere in this schema.
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "jwantra_integrations"`);
    }
}
