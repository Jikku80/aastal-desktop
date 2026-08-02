import { MigrationInterface, QueryRunner } from "typeorm";

// SQLite/offline counterpart of 1784800000000-AppointmentIndependentBookingNullable
// (postgres). SQLite has no ALTER COLUMN, so this rebuilds the table —
// same pattern used elsewhere in this migration set (see AutoGenDiff).
// Only change from the existing schema: "clinicId" and "patientId" drop
// their NOT NULL so independent/marketplace bookings (Consult Now, direct
// doctor booking) can be saved with both left null, same as the postgres
// driver.
export class AppointmentIndependentBookingNullable1784800000000 implements MigrationInterface {
    name = 'AppointmentIndependentBookingNullable1784800000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_fe0f5ef013379644038d1396cb"`);
        await queryRunner.query(`DROP INDEX "IDX_281d14b920f397a215f003d85d"`);
        await queryRunner.query(`DROP INDEX "IDX_b19a86e0916d25b4b8249580f1"`);
        await queryRunner.query(`DROP INDEX "IDX_55c5a275a4b7df1bbffd742b52"`);
        await queryRunner.query(`CREATE TABLE "temporary_appointments" ("syncStatus" varchar(20) NOT NULL DEFAULT ('synced'), "id" varchar PRIMARY KEY NOT NULL, "clinicId" varchar, "branchId" varchar, "patientId" varchar, "dentistId" varchar NOT NULL, "serviceId" varchar, "type" varchar, "status" varchar CHECK( "status" IN ('scheduled','confirmed','checked_in','in_progress','completed','cancelled','no_show','rescheduled') ) NOT NULL DEFAULT ('scheduled'), "scheduledAt" datetime NOT NULL, "endsAt" datetime NOT NULL, "durationMinutes" integer NOT NULL DEFAULT (30), "notes" varchar, "chiefComplaint" varchar, "diagnosis" varchar, "treatment" varchar, "vitals" text, "prescriptions" text, "followUpDate" datetime, "cancelReason" varchar, "reminderSentAt" datetime, "doctorReminderSentAt" datetime, "fee" decimal(10,2), "isPaid" boolean NOT NULL DEFAULT (0), "checkedInAt" datetime, "consultationType" varchar DEFAULT ('in_person'), "bookingContext" varchar DEFAULT ('clinic'), "videoRoomUrl" varchar, "videoRoomId" varchar, "independentLocationId" varchar, "cancellationReason" varchar, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "FK_299d8147ef59909b1e6531e791c" FOREIGN KEY ("branchId") REFERENCES "branches" ("id") ON DELETE SET NULL ON UPDATE NO ACTION, CONSTRAINT "FK_13c2e57cb81b44f062ba24df57d" FOREIGN KEY ("patientId") REFERENCES "patients" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION, CONSTRAINT "FK_203ee1f7e1f72db2512f1af43ab" FOREIGN KEY ("dentistId") REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION, CONSTRAINT "FK_f77953c373efb8ab146d98e90c3" FOREIGN KEY ("serviceId") REFERENCES "clinic_services" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_appointments"("syncStatus", "id", "clinicId", "branchId", "patientId", "dentistId", "serviceId", "type", "status", "scheduledAt", "endsAt", "durationMinutes", "notes", "chiefComplaint", "diagnosis", "treatment", "vitals", "prescriptions", "followUpDate", "cancelReason", "reminderSentAt", "doctorReminderSentAt", "fee", "isPaid", "checkedInAt", "consultationType", "bookingContext", "videoRoomUrl", "videoRoomId", "independentLocationId", "cancellationReason", "createdAt", "updatedAt") SELECT "syncStatus", "id", "clinicId", "branchId", "patientId", "dentistId", "serviceId", "type", "status", "scheduledAt", "endsAt", "durationMinutes", "notes", "chiefComplaint", "diagnosis", "treatment", "vitals", "prescriptions", "followUpDate", "cancelReason", "reminderSentAt", "doctorReminderSentAt", "fee", "isPaid", "checkedInAt", "consultationType", "bookingContext", "videoRoomUrl", "videoRoomId", "independentLocationId", "cancellationReason", "createdAt", "updatedAt" FROM "appointments"`);
        await queryRunner.query(`DROP TABLE "appointments"`);
        await queryRunner.query(`ALTER TABLE "temporary_appointments" RENAME TO "appointments"`);
        await queryRunner.query(`CREATE INDEX "IDX_fe0f5ef013379644038d1396cb" ON "appointments" ("dentistId", "scheduledAt")`);
        await queryRunner.query(`CREATE INDEX "IDX_281d14b920f397a215f003d85d" ON "appointments" ("branchId", "scheduledAt")`);
        await queryRunner.query(`CREATE INDEX "IDX_b19a86e0916d25b4b8249580f1" ON "appointments" ("clinicId", "dentistId")`);
        await queryRunner.query(`CREATE INDEX "IDX_55c5a275a4b7df1bbffd742b52" ON "appointments" ("clinicId", "scheduledAt")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Note: this will fail if any independent-booking rows (null
        // clinicId/patientId) exist by the time this runs — that's
        // expected/acceptable for a down migration undoing this change.
        await queryRunner.query(`DROP INDEX "IDX_55c5a275a4b7df1bbffd742b52"`);
        await queryRunner.query(`DROP INDEX "IDX_b19a86e0916d25b4b8249580f1"`);
        await queryRunner.query(`DROP INDEX "IDX_281d14b920f397a215f003d85d"`);
        await queryRunner.query(`DROP INDEX "IDX_fe0f5ef013379644038d1396cb"`);
        await queryRunner.query(`ALTER TABLE "appointments" RENAME TO "temporary_appointments"`);
        await queryRunner.query(`CREATE TABLE "appointments" ("syncStatus" varchar(20) NOT NULL DEFAULT ('synced'), "id" varchar PRIMARY KEY NOT NULL, "clinicId" varchar NOT NULL, "branchId" varchar, "patientId" varchar NOT NULL, "dentistId" varchar NOT NULL, "serviceId" varchar, "type" varchar, "status" varchar CHECK( "status" IN ('scheduled','confirmed','checked_in','in_progress','completed','cancelled','no_show','rescheduled') ) NOT NULL DEFAULT ('scheduled'), "scheduledAt" datetime NOT NULL, "endsAt" datetime NOT NULL, "durationMinutes" integer NOT NULL DEFAULT (30), "notes" varchar, "chiefComplaint" varchar, "diagnosis" varchar, "treatment" varchar, "vitals" text, "prescriptions" text, "followUpDate" datetime, "cancelReason" varchar, "reminderSentAt" datetime, "doctorReminderSentAt" datetime, "fee" decimal(10,2), "isPaid" boolean NOT NULL DEFAULT (0), "checkedInAt" datetime, "consultationType" varchar DEFAULT ('in_person'), "bookingContext" varchar DEFAULT ('clinic'), "videoRoomUrl" varchar, "videoRoomId" varchar, "independentLocationId" varchar, "cancellationReason" varchar, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "FK_299d8147ef59909b1e6531e791c" FOREIGN KEY ("branchId") REFERENCES "branches" ("id") ON DELETE SET NULL ON UPDATE NO ACTION, CONSTRAINT "FK_13c2e57cb81b44f062ba24df57d" FOREIGN KEY ("patientId") REFERENCES "patients" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION, CONSTRAINT "FK_203ee1f7e1f72db2512f1af43ab" FOREIGN KEY ("dentistId") REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION, CONSTRAINT "FK_f77953c373efb8ab146d98e90c3" FOREIGN KEY ("serviceId") REFERENCES "clinic_services" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "appointments"("syncStatus", "id", "clinicId", "branchId", "patientId", "dentistId", "serviceId", "type", "status", "scheduledAt", "endsAt", "durationMinutes", "notes", "chiefComplaint", "diagnosis", "treatment", "vitals", "prescriptions", "followUpDate", "cancelReason", "reminderSentAt", "doctorReminderSentAt", "fee", "isPaid", "checkedInAt", "consultationType", "bookingContext", "videoRoomUrl", "videoRoomId", "independentLocationId", "cancellationReason", "createdAt", "updatedAt") SELECT "syncStatus", "id", "clinicId", "branchId", "patientId", "dentistId", "serviceId", "type", "status", "scheduledAt", "endsAt", "durationMinutes", "notes", "chiefComplaint", "diagnosis", "treatment", "vitals", "prescriptions", "followUpDate", "cancelReason", "reminderSentAt", "doctorReminderSentAt", "fee", "isPaid", "checkedInAt", "consultationType", "bookingContext", "videoRoomUrl", "videoRoomId", "independentLocationId", "cancellationReason", "createdAt", "updatedAt" FROM "temporary_appointments"`);
        await queryRunner.query(`DROP TABLE "temporary_appointments"`);
        await queryRunner.query(`CREATE INDEX "IDX_55c5a275a4b7df1bbffd742b52" ON "appointments" ("clinicId", "scheduledAt")`);
        await queryRunner.query(`CREATE INDEX "IDX_b19a86e0916d25b4b8249580f1" ON "appointments" ("clinicId", "dentistId")`);
        await queryRunner.query(`CREATE INDEX "IDX_281d14b920f397a215f003d85d" ON "appointments" ("branchId", "scheduledAt")`);
        await queryRunner.query(`CREATE INDEX "IDX_fe0f5ef013379644038d1396cb" ON "appointments" ("dentistId", "scheduledAt")`);
    }

}