import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1782585652427 implements MigrationInterface {
    name = 'Migration1782585652427'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "subscriptions" ("id" varchar PRIMARY KEY NOT NULL, "clinicId" varchar NOT NULL, "plan" varchar NOT NULL DEFAULT ('free'), "status" varchar NOT NULL DEFAULT ('trial'), "billingCycle" varchar, "currentPeriodStart" datetime, "currentPeriodEnd" datetime, "cancelAt" datetime, "features" text, "externalSubscriptionId" varchar, "expiryWarningSentAt" datetime, "expiredNotifSentAt" datetime, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "UQ_02beb9567811d522b1edf985043" UNIQUE ("clinicId"))`);
        await queryRunner.query(`CREATE TABLE "subscription_requests" ("id" varchar PRIMARY KEY NOT NULL, "userId" varchar NOT NULL, "clinicId" varchar NOT NULL, "requestedPlan" varchar NOT NULL, "billingCycle" varchar, "type" varchar NOT NULL DEFAULT ('activation'), "status" varchar NOT NULL DEFAULT ('pending'), "adminNote" varchar, "contactNumber" varchar, "paymentProofUrl" varchar, "paymentMethod" varchar, "numBranches" integer, "reviewedBy" varchar, "reviewedAt" datetime, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`CREATE TABLE "temporary_subscription_requests" ("id" varchar PRIMARY KEY NOT NULL, "userId" varchar NOT NULL, "clinicId" varchar NOT NULL, "requestedPlan" varchar NOT NULL, "billingCycle" varchar, "type" varchar NOT NULL DEFAULT ('activation'), "status" varchar NOT NULL DEFAULT ('pending'), "adminNote" varchar, "contactNumber" varchar, "paymentProofUrl" varchar, "paymentMethod" varchar, "numBranches" integer, "reviewedBy" varchar, "reviewedAt" datetime, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "FK_95f01a6c4ca3863921367c69062" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, CONSTRAINT "FK_7f8f4ff5b8f85cda553b7dc2009" FOREIGN KEY ("clinicId") REFERENCES "clinics" ("id") ON DELETE CASCADE ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_subscription_requests"("id", "userId", "clinicId", "requestedPlan", "billingCycle", "type", "status", "adminNote", "contactNumber", "paymentProofUrl", "paymentMethod", "numBranches", "reviewedBy", "reviewedAt", "createdAt", "updatedAt") SELECT "id", "userId", "clinicId", "requestedPlan", "billingCycle", "type", "status", "adminNote", "contactNumber", "paymentProofUrl", "paymentMethod", "numBranches", "reviewedBy", "reviewedAt", "createdAt", "updatedAt" FROM "subscription_requests"`);
        await queryRunner.query(`DROP TABLE "subscription_requests"`);
        await queryRunner.query(`ALTER TABLE "temporary_subscription_requests" RENAME TO "subscription_requests"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "subscription_requests" RENAME TO "temporary_subscription_requests"`);
        await queryRunner.query(`CREATE TABLE "subscription_requests" ("id" varchar PRIMARY KEY NOT NULL, "userId" varchar NOT NULL, "clinicId" varchar NOT NULL, "requestedPlan" varchar NOT NULL, "billingCycle" varchar, "type" varchar NOT NULL DEFAULT ('activation'), "status" varchar NOT NULL DEFAULT ('pending'), "adminNote" varchar, "contactNumber" varchar, "paymentProofUrl" varchar, "paymentMethod" varchar, "numBranches" integer, "reviewedBy" varchar, "reviewedAt" datetime, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`INSERT INTO "subscription_requests"("id", "userId", "clinicId", "requestedPlan", "billingCycle", "type", "status", "adminNote", "contactNumber", "paymentProofUrl", "paymentMethod", "numBranches", "reviewedBy", "reviewedAt", "createdAt", "updatedAt") SELECT "id", "userId", "clinicId", "requestedPlan", "billingCycle", "type", "status", "adminNote", "contactNumber", "paymentProofUrl", "paymentMethod", "numBranches", "reviewedBy", "reviewedAt", "createdAt", "updatedAt" FROM "temporary_subscription_requests"`);
        await queryRunner.query(`DROP TABLE "temporary_subscription_requests"`);
        await queryRunner.query(`DROP TABLE "subscription_requests"`);
        await queryRunner.query(`DROP TABLE "subscriptions"`);
    }

}
