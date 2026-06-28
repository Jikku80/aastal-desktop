import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1782471025559 implements MigrationInterface {
    name = 'Migration1782471025559'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "patient_record_consents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "patientAccountId" character varying NOT NULL, "clinicId" character varying NOT NULL, "granted" boolean NOT NULL DEFAULT false, "grantedAt" TIMESTAMP, "revokedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_e94117ad9241afd3bba8eedb970" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_e0a25334baed8d97b4fc01be16" ON "patient_record_consents" ("patientAccountId", "clinicId") `);
        await queryRunner.query(`CREATE TYPE "public"."refill_requests_status_enum" AS ENUM('pending', 'approved', 'denied')`);
        await queryRunner.query(`CREATE TABLE "refill_requests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "patientAccountId" character varying NOT NULL, "clinicPatientId" character varying NOT NULL, "clinicId" character varying NOT NULL, "doctorId" character varying, "sourceRecordId" character varying NOT NULL, "prescriptionId" character varying, "medicineName" character varying NOT NULL, "dosage" character varying, "frequency" character varying, "duration" character varying, "instructions" text, "status" "public"."refill_requests_status_enum" NOT NULL DEFAULT 'pending', "resolvedByDoctorId" character varying, "newRecordId" character varying, "denialReason" text, "resolvedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_76acb3c2d708b06f9ea1cc81ed6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_8c06eafd4c0c19cdbb5021d94f" ON "refill_requests" ("doctorId", "status") `);
        await queryRunner.query(`CREATE INDEX "IDX_6f1901a44cdc1e4c59b4c32b19" ON "refill_requests" ("clinicId", "status") `);
        await queryRunner.query(`CREATE TYPE "public"."referrals_status_enum" AS ENUM('pending', 'accepted', 'completed', 'declined')`);
        await queryRunner.query(`CREATE TABLE "referrals" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "referringClinicId" character varying NOT NULL, "referringDoctorId" character varying NOT NULL, "patientId" character varying NOT NULL, "patientAccountId" character varying, "targetClinicId" character varying, "targetClinicSlug" character varying, "reason" text NOT NULL, "attachedRecordIds" text array NOT NULL DEFAULT '{}', "attachedFileIds" text array NOT NULL DEFAULT '{}', "status" "public"."referrals_status_enum" NOT NULL DEFAULT 'pending', "acceptedByDoctorId" character varying, "notes" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ea9980e34f738b6252817326c08" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_23ec54dc842161ba9b9947c908" ON "referrals" ("referringClinicId", "status") `);
        await queryRunner.query(`CREATE INDEX "IDX_22bf1c13419bf1e551f8e3ed53" ON "referrals" ("targetClinicId", "status") `);
        await queryRunner.query(`ALTER TABLE "patient_accounts" ADD "allergies" text array NOT NULL DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "patient_accounts" ADD "chronicConditions" text array NOT NULL DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "patient_accounts" ADD "vitals" jsonb`);
        await queryRunner.query(`CREATE TYPE "public"."patient_account_links_verificationstatus_enum" AS ENUM('auto_matched', 'pending_claim', 'verified', 'rejected')`);
        await queryRunner.query(`ALTER TABLE "patient_account_links" ADD "verificationStatus" "public"."patient_account_links_verificationstatus_enum" NOT NULL DEFAULT 'auto_matched'`);
        await queryRunner.query(`ALTER TABLE "patient_account_links" ADD "claimNote" text`);
        await queryRunner.query(`ALTER TABLE "payroll_deduction_rules" ALTER COLUMN "halfDayDeductionRate" SET DEFAULT '0.5'`);
        await queryRunner.query(`ALTER TABLE "payroll_deduction_rules" ALTER COLUMN "overtimeRateMultiplier" SET DEFAULT '1.5'`);
        await queryRunner.query(`ALTER TYPE "public"."notifications_type_enum" RENAME TO "notifications_type_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."notifications_type_enum" AS ENUM('appointment_created', 'appointment_updated', 'appointment_cancelled', 'appointment_reminder', 'invoice_created', 'invoice_paid', 'patient_added', 'history_access_requested', 'referral_received', 'refill_requested', 'refill_approved', 'leave_requested', 'leave_approved', 'leave_rejected', 'schedule_updated', 'shift_assigned', 'holiday_created', 'notice_posted', 'notice_updated', 'system')`);
        await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "public"."notifications_type_enum" USING "type"::"text"::"public"."notifications_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."notifications_type_enum_old"`);
        await queryRunner.query(`ALTER TABLE "invoices" ALTER COLUMN "invoiceUuid" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "invoices" ALTER COLUMN "invoiceUuid" SET DEFAULT gen_random_uuid()`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "invoices" ALTER COLUMN "invoiceUuid" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "invoices" ALTER COLUMN "invoiceUuid" SET DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`CREATE TYPE "public"."notifications_type_enum_old" AS ENUM('appointment_created', 'appointment_updated', 'appointment_cancelled', 'appointment_reminder', 'invoice_created', 'invoice_paid', 'patient_added', 'leave_requested', 'leave_approved', 'leave_rejected', 'schedule_updated', 'shift_assigned', 'holiday_created', 'notice_posted', 'notice_updated', 'system')`);
        await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "public"."notifications_type_enum_old" USING "type"::"text"::"public"."notifications_type_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."notifications_type_enum_old" RENAME TO "notifications_type_enum"`);
        await queryRunner.query(`ALTER TABLE "payroll_deduction_rules" ALTER COLUMN "overtimeRateMultiplier" SET DEFAULT 1.5`);
        await queryRunner.query(`ALTER TABLE "payroll_deduction_rules" ALTER COLUMN "halfDayDeductionRate" SET DEFAULT 0.5`);
        await queryRunner.query(`ALTER TABLE "patient_account_links" DROP COLUMN "claimNote"`);
        await queryRunner.query(`ALTER TABLE "patient_account_links" DROP COLUMN "verificationStatus"`);
        await queryRunner.query(`DROP TYPE "public"."patient_account_links_verificationstatus_enum"`);
        await queryRunner.query(`ALTER TABLE "patient_accounts" DROP COLUMN "vitals"`);
        await queryRunner.query(`ALTER TABLE "patient_accounts" DROP COLUMN "chronicConditions"`);
        await queryRunner.query(`ALTER TABLE "patient_accounts" DROP COLUMN "allergies"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_22bf1c13419bf1e551f8e3ed53"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_23ec54dc842161ba9b9947c908"`);
        await queryRunner.query(`DROP TABLE "referrals"`);
        await queryRunner.query(`DROP TYPE "public"."referrals_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6f1901a44cdc1e4c59b4c32b19"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8c06eafd4c0c19cdbb5021d94f"`);
        await queryRunner.query(`DROP TABLE "refill_requests"`);
        await queryRunner.query(`DROP TYPE "public"."refill_requests_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e0a25334baed8d97b4fc01be16"`);
        await queryRunner.query(`DROP TABLE "patient_record_consents"`);
    }

}
