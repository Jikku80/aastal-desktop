import { MigrationInterface, QueryRunner } from "typeorm";

// Independent/marketplace bookings (bookingContext: 'independent' — used
// by Consult Now and direct "Book Appointment with this doctor" flows)
// are not tied to any clinic, and have no clinic-scoped Patient record to
// link to. PatientPortalService.bookAppointment already sets both
// clinicId and patientId to null for that case, but the columns were
// still NOT NULL at the database level, so every independent booking
// failed with:
//   QueryFailedError: null value in column "clinicId" of relation
//   "appointments" violates not-null constraint
// This drops the NOT NULL constraint on both columns to match what the
// application has been trying to do all along. See appointment.entity.ts
// for the corresponding `nullable: true` change.
export class AppointmentIndependentBookingNullable1784800000000 implements MigrationInterface {
    name = 'AppointmentIndependentBookingNullable1784800000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "appointments" ALTER COLUMN "clinicId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "appointments" ALTER COLUMN "patientId" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Note: this will fail if any independent-booking rows (null
        // clinicId/patientId) exist by the time this runs — that's
        // expected/acceptable for a down migration undoing this change.
        await queryRunner.query(`ALTER TABLE "appointments" ALTER COLUMN "patientId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "appointments" ALTER COLUMN "clinicId" SET NOT NULL`);
    }

}