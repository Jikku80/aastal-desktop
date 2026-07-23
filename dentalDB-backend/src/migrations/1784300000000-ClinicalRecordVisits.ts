import { MigrationInterface, QueryRunner } from "typeorm";

export class ClinicalRecordVisits1784300000000 implements MigrationInterface {
    name = 'ClinicalRecordVisits1784300000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Billing-driven clinical records may have no doctor attached to any
        // billed service — allow doctorId to be blank instead of forcing a value.
        await queryRunner.query(`ALTER TABLE "clinical_records" ALTER COLUMN "doctorId" DROP NOT NULL`);
        // Dated visit history (date, services, doctor, appointment/invoice link)
        // appended to automatically from the Billing modal, instead of a single
        // treatmentPlan text box being overwritten on every visit.
        await queryRunner.query(`ALTER TABLE "clinical_records" ADD "visits" jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "clinical_records" DROP COLUMN "visits"`);
        await queryRunner.query(`ALTER TABLE "clinical_records" ALTER COLUMN "doctorId" SET NOT NULL`);
    }

}
