import { MigrationInterface, QueryRunner } from "typeorm";

// Phase 9 — Finance Module: Chart of Accounts, Journal, Accounting Periods.
// Adds the general-ledger tables that sit underneath the balance sheet /
// trial balance / P&L / cash flow statements. Clinic-scoped the same way
// every other finance-adjacent table (Expense, Invoice, Payroll) already
// is — no new tenancy concept. See phase doc §9.1–§9.6.
export class FinanceModule1786100000000 implements MigrationInterface {
    name = 'FinanceModule1786100000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // ── finance_accounts ────────────────────────────────────────────────
        await queryRunner.query(`CREATE TYPE "public"."finance_accounts_type_enum" AS ENUM('asset', 'liability', 'equity', 'revenue', 'expense')`);
        await queryRunner.query(`CREATE TYPE "public"."finance_accounts_normalbalance_enum" AS ENUM('debit', 'credit')`);
        await queryRunner.query(`
            CREATE TABLE "finance_accounts" (
                "syncStatus" character varying(20) NOT NULL DEFAULT 'synced',
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "clinicId" character varying NOT NULL,
                "code" character varying NOT NULL,
                "name" character varying NOT NULL,
                "type" "public"."finance_accounts_type_enum" NOT NULL,
                "normalBalance" "public"."finance_accounts_normalbalance_enum" NOT NULL,
                "parentId" uuid,
                "isSystem" boolean NOT NULL DEFAULT false,
                "isActive" boolean NOT NULL DEFAULT true,
                "description" character varying,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_finance_accounts_id" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_finance_accounts_clinic_code" UNIQUE ("clinicId", "code")
            )
        `);
        await queryRunner.query(`CREATE INDEX "IDX_finance_accounts_clinic_type" ON "finance_accounts" ("clinicId", "type")`);

        // ── finance_accounting_periods ──────────────────────────────────────
        await queryRunner.query(`CREATE TYPE "public"."finance_accounting_periods_status_enum" AS ENUM('open', 'closed')`);
        await queryRunner.query(`
            CREATE TABLE "finance_accounting_periods" (
                "syncStatus" character varying(20) NOT NULL DEFAULT 'synced',
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "clinicId" character varying NOT NULL,
                "label" character varying NOT NULL,
                "startDate" date NOT NULL,
                "endDate" date NOT NULL,
                "status" "public"."finance_accounting_periods_status_enum" NOT NULL DEFAULT 'open',
                "closedBy" character varying,
                "closedAt" TIMESTAMP,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_finance_accounting_periods_id" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`CREATE INDEX "IDX_finance_periods_clinic_dates" ON "finance_accounting_periods" ("clinicId", "startDate", "endDate")`);

        // ── finance_journal_entries ─────────────────────────────────────────
        await queryRunner.query(`CREATE TYPE "public"."finance_journal_entries_sourcetype_enum" AS ENUM('invoice_payment', 'expense_approved', 'manual', 'opening_balance', 'reversal')`);
        await queryRunner.query(`
            CREATE TABLE "finance_journal_entries" (
                "syncStatus" character varying(20) NOT NULL DEFAULT 'synced',
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "clinicId" character varying NOT NULL,
                "branchId" character varying,
                "date" date NOT NULL,
                "memo" text NOT NULL,
                "sourceType" "public"."finance_journal_entries_sourcetype_enum" NOT NULL DEFAULT 'manual',
                "sourceId" character varying,
                "postedBy" character varying NOT NULL,
                "isReversal" boolean NOT NULL DEFAULT false,
                "reversalOfId" character varying,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_finance_journal_entries_id" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`CREATE INDEX "IDX_fje_clinic_date" ON "finance_journal_entries" ("clinicId", "date")`);
        await queryRunner.query(`CREATE INDEX "IDX_fje_clinic_source" ON "finance_journal_entries" ("clinicId", "sourceType", "sourceId")`);

        // ── finance_journal_lines ───────────────────────────────────────────
        await queryRunner.query(`
            CREATE TABLE "finance_journal_lines" (
                "syncStatus" character varying(20) NOT NULL DEFAULT 'synced',
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "journalEntryId" uuid NOT NULL,
                "accountId" uuid NOT NULL,
                "debit" numeric(12,2) NOT NULL DEFAULT 0,
                "credit" numeric(12,2) NOT NULL DEFAULT 0,
                "description" character varying,
                CONSTRAINT "PK_finance_journal_lines_id" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            ALTER TABLE "finance_journal_lines"
            ADD CONSTRAINT "FK_fjl_journalEntryId" FOREIGN KEY ("journalEntryId")
            REFERENCES "finance_journal_entries"("id") ON DELETE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "finance_journal_lines"
            ADD CONSTRAINT "FK_fjl_accountId" FOREIGN KEY ("accountId")
            REFERENCES "finance_accounts"("id") ON DELETE RESTRICT
        `);
        await queryRunner.query(`CREATE INDEX "IDX_fjl_accountId" ON "finance_journal_lines" ("accountId")`);
        await queryRunner.query(`CREATE INDEX "IDX_fjl_journalEntryId" ON "finance_journal_lines" ("journalEntryId")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_fjl_journalEntryId"`);
        await queryRunner.query(`DROP INDEX "IDX_fjl_accountId"`);
        await queryRunner.query(`ALTER TABLE "finance_journal_lines" DROP CONSTRAINT "FK_fjl_accountId"`);
        await queryRunner.query(`ALTER TABLE "finance_journal_lines" DROP CONSTRAINT "FK_fjl_journalEntryId"`);
        await queryRunner.query(`DROP TABLE "finance_journal_lines"`);

        await queryRunner.query(`DROP INDEX "IDX_fje_clinic_source"`);
        await queryRunner.query(`DROP INDEX "IDX_fje_clinic_date"`);
        await queryRunner.query(`DROP TABLE "finance_journal_entries"`);
        await queryRunner.query(`DROP TYPE "public"."finance_journal_entries_sourcetype_enum"`);

        await queryRunner.query(`DROP INDEX "IDX_finance_periods_clinic_dates"`);
        await queryRunner.query(`DROP TABLE "finance_accounting_periods"`);
        await queryRunner.query(`DROP TYPE "public"."finance_accounting_periods_status_enum"`);

        await queryRunner.query(`DROP INDEX "IDX_finance_accounts_clinic_type"`);
        await queryRunner.query(`DROP TABLE "finance_accounts"`);
        await queryRunner.query(`DROP TYPE "public"."finance_accounts_normalbalance_enum"`);
        await queryRunner.query(`DROP TYPE "public"."finance_accounts_type_enum"`);
    }
}
