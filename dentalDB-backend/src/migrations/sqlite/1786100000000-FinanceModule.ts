import { MigrationInterface, QueryRunner } from "typeorm";

// SQLite (offline/desktop) counterpart of 1786100000000-FinanceModule
// (Postgres) — see that file's comment. Enum-typed columns become plain
// varchar here (same convention as every other isSQLite-conditioned entity
// in this codebase). FK columns kept unconstrained on the parent-side
// self-reference (finance_accounts.parentId) but the journal-line → entry
// and journal-line → account relations use real FKs since they're created
// fresh in this same migration (same approach as MedicineBatch → Product).
export class FinanceModule1786100000000 implements MigrationInterface {
    name = 'FinanceModule1786100000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // ── finance_accounts ────────────────────────────────────────────────
        await queryRunner.query(`CREATE TABLE "finance_accounts" ("syncStatus" varchar(20) NOT NULL DEFAULT ('synced'), "id" varchar PRIMARY KEY NOT NULL, "clinicId" varchar NOT NULL, "code" varchar NOT NULL, "name" varchar NOT NULL, "type" varchar NOT NULL, "normalBalance" varchar NOT NULL, "parentId" varchar, "isSystem" boolean NOT NULL DEFAULT (0), "isActive" boolean NOT NULL DEFAULT (1), "description" varchar, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "UQ_finance_accounts_clinic_code" UNIQUE ("clinicId", "code"))`);
        await queryRunner.query(`CREATE INDEX "IDX_finance_accounts_clinic_type" ON "finance_accounts" ("clinicId", "type")`);

        // ── finance_accounting_periods ──────────────────────────────────────
        await queryRunner.query(`CREATE TABLE "finance_accounting_periods" ("syncStatus" varchar(20) NOT NULL DEFAULT ('synced'), "id" varchar PRIMARY KEY NOT NULL, "clinicId" varchar NOT NULL, "label" varchar NOT NULL, "startDate" date NOT NULL, "endDate" date NOT NULL, "status" varchar NOT NULL DEFAULT ('open'), "closedBy" varchar, "closedAt" datetime, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`CREATE INDEX "IDX_finance_periods_clinic_dates" ON "finance_accounting_periods" ("clinicId", "startDate", "endDate")`);

        // ── finance_journal_entries ─────────────────────────────────────────
        await queryRunner.query(`CREATE TABLE "finance_journal_entries" ("syncStatus" varchar(20) NOT NULL DEFAULT ('synced'), "id" varchar PRIMARY KEY NOT NULL, "clinicId" varchar NOT NULL, "branchId" varchar, "date" date NOT NULL, "memo" text NOT NULL, "sourceType" varchar NOT NULL DEFAULT ('manual'), "sourceId" varchar, "postedBy" varchar NOT NULL, "isReversal" boolean NOT NULL DEFAULT (0), "reversalOfId" varchar, "createdAt" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`CREATE INDEX "IDX_fje_clinic_date" ON "finance_journal_entries" ("clinicId", "date")`);
        await queryRunner.query(`CREATE INDEX "IDX_fje_clinic_source" ON "finance_journal_entries" ("clinicId", "sourceType", "sourceId")`);

        // ── finance_journal_lines ───────────────────────────────────────────
        await queryRunner.query(`CREATE TABLE "finance_journal_lines" ("syncStatus" varchar(20) NOT NULL DEFAULT ('synced'), "id" varchar PRIMARY KEY NOT NULL, "journalEntryId" varchar NOT NULL, "accountId" varchar NOT NULL, "debit" decimal(12,2) NOT NULL DEFAULT (0), "credit" decimal(12,2) NOT NULL DEFAULT (0), "description" varchar, CONSTRAINT "FK_fjl_journalEntryId" FOREIGN KEY ("journalEntryId") REFERENCES "finance_journal_entries" ("id") ON DELETE CASCADE, CONSTRAINT "FK_fjl_accountId" FOREIGN KEY ("accountId") REFERENCES "finance_accounts" ("id") ON DELETE RESTRICT)`);
        await queryRunner.query(`CREATE INDEX "IDX_fjl_accountId" ON "finance_journal_lines" ("accountId")`);
        await queryRunner.query(`CREATE INDEX "IDX_fjl_journalEntryId" ON "finance_journal_lines" ("journalEntryId")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_fjl_journalEntryId"`);
        await queryRunner.query(`DROP INDEX "IDX_fjl_accountId"`);
        await queryRunner.query(`DROP TABLE "finance_journal_lines"`);

        await queryRunner.query(`DROP INDEX "IDX_fje_clinic_source"`);
        await queryRunner.query(`DROP INDEX "IDX_fje_clinic_date"`);
        await queryRunner.query(`DROP TABLE "finance_journal_entries"`);

        await queryRunner.query(`DROP INDEX "IDX_finance_periods_clinic_dates"`);
        await queryRunner.query(`DROP TABLE "finance_accounting_periods"`);

        await queryRunner.query(`DROP INDEX "IDX_finance_accounts_clinic_type"`);
        await queryRunner.query(`DROP TABLE "finance_accounts"`);
    }
}
