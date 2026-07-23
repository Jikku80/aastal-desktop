import { MigrationInterface, QueryRunner } from "typeorm";

// Creates the patient_accounts / patient_account_links tables for the
// SQLite (offline/desktop) database.
//
// These tables were introduced on Postgres back in migration
// 1781849186285-Migration.ts (and extended in 1782471025559-Migration.ts),
// but no equivalent was ever added to the SQLite migration set. The very
// next SQLite migration, 1784200000000-PatientAccountPassword, does
// `ALTER TABLE "patient_accounts" ADD ...`, which was failing on every
// desktop/offline install with `SqliteError: no such table: patient_accounts`
// because the table was never created in the first place.
//
// Columns below reflect the final shape of PatientAccount /
// PatientAccountLink (src/patient-auth/entities) as of just before
// PatientAccountPassword1784200000000 (which itself adds "password" and
// "hasPassword" right after this runs — left out here on purpose so the
// two migrations combined produce the same end state as Postgres).
export class PatientAccounts1784100000000 implements MigrationInterface {
    name = 'PatientAccounts1784100000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "patient_accounts" ("id" varchar PRIMARY KEY NOT NULL, "phone" varchar, "email" varchar, "firstName" varchar, "lastName" varchar, "dateOfBirth" datetime, "gender" varchar, "avatarUrl" varchar, "otpHash" varchar, "otpExpires" datetime, "refreshToken" varchar, "notificationPreferences" text, "allergies" text NOT NULL DEFAULT (''), "chronicConditions" text NOT NULL DEFAULT (''), "vitals" text, "isActive" boolean NOT NULL DEFAULT (1), "lastLoginAt" datetime, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_abcb023cf5a4219078e202411f" ON "patient_accounts" ("email") WHERE "email" IS NOT NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_cf359f1b29378e282bdea11ca1" ON "patient_accounts" ("phone") WHERE "phone" IS NOT NULL`);

        await queryRunner.query(`CREATE TABLE "patient_account_links" ("id" varchar PRIMARY KEY NOT NULL, "patientAccountId" varchar NOT NULL, "clinicPatientId" varchar, "relation" varchar NOT NULL DEFAULT ('self'), "label" varchar, "isDefault" boolean NOT NULL DEFAULT (0), "verificationStatus" varchar NOT NULL DEFAULT ('auto_matched'), "claimNote" text, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "FK_6ed6c6d734834a0354210115303" FOREIGN KEY ("patientAccountId") REFERENCES "patient_accounts" ("id") ON DELETE CASCADE ON UPDATE NO ACTION)`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_patient_account_links_account_patient" ON "patient_account_links" ("patientAccountId", "clinicPatientId")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_patient_account_links_account_patient"`);
        await queryRunner.query(`DROP TABLE "patient_account_links"`);
        await queryRunner.query(`DROP INDEX "IDX_cf359f1b29378e282bdea11ca1"`);
        await queryRunner.query(`DROP INDEX "IDX_abcb023cf5a4219078e202411f"`);
        await queryRunner.query(`DROP TABLE "patient_accounts"`);
    }

}