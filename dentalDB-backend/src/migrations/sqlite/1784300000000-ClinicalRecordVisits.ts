import { MigrationInterface, QueryRunner } from "typeorm";

export class ClinicalRecordVisits1784300000000 implements MigrationInterface {
    name = 'ClinicalRecordVisits1784300000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // SQLite can't ALTER COLUMN directly — rebuild the table the same way
        // earlier sqlite migrations in this project do (temporary table + copy).
        await queryRunner.query(`DROP INDEX "IDX_0b927d4318849a577d900f450c"`);
        await queryRunner.query(`CREATE TABLE "temporary_clinical_records" ("syncStatus" varchar(20) NOT NULL DEFAULT ('synced'), "id" varchar PRIMARY KEY NOT NULL, "clinicId" varchar NOT NULL, "patientId" varchar NOT NULL, "doctorId" varchar, "appointmentId" varchar, "diagnosisNotes" text, "treatmentPlan" text, "visits" text, "attachments" text, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "FK_944ba522ae10d6b99ea8517c476" FOREIGN KEY ("patientId") REFERENCES "patients" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION, CONSTRAINT "FK_5da7ecdb4ec42371f7815827956" FOREIGN KEY ("doctorId") REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_clinical_records"("syncStatus", "id", "clinicId", "patientId", "doctorId", "appointmentId", "diagnosisNotes", "treatmentPlan", "attachments", "createdAt", "updatedAt") SELECT "syncStatus", "id", "clinicId", "patientId", "doctorId", "appointmentId", "diagnosisNotes", "treatmentPlan", "attachments", "createdAt", "updatedAt" FROM "clinical_records"`);
        await queryRunner.query(`DROP TABLE "clinical_records"`);
        await queryRunner.query(`ALTER TABLE "temporary_clinical_records" RENAME TO "clinical_records"`);
        await queryRunner.query(`CREATE INDEX "IDX_0b927d4318849a577d900f450c" ON "clinical_records" ("clinicId", "patientId") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_0b927d4318849a577d900f450c"`);
        await queryRunner.query(`ALTER TABLE "clinical_records" RENAME TO "temporary_clinical_records"`);
        await queryRunner.query(`CREATE TABLE "clinical_records" ("syncStatus" varchar(20) NOT NULL DEFAULT ('synced'), "id" varchar PRIMARY KEY NOT NULL, "clinicId" varchar NOT NULL, "patientId" varchar NOT NULL, "doctorId" varchar NOT NULL, "appointmentId" varchar, "diagnosisNotes" text, "treatmentPlan" text, "attachments" text, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`INSERT INTO "clinical_records"("syncStatus", "id", "clinicId", "patientId", "doctorId", "appointmentId", "diagnosisNotes", "treatmentPlan", "attachments", "createdAt", "updatedAt") SELECT "syncStatus", "id", "clinicId", "patientId", "doctorId", "appointmentId", "diagnosisNotes", "treatmentPlan", "attachments", "createdAt", "updatedAt" FROM "temporary_clinical_records"`);
        await queryRunner.query(`DROP TABLE "temporary_clinical_records"`);
        await queryRunner.query(`CREATE INDEX "IDX_0b927d4318849a577d900f450c" ON "clinical_records" ("clinicId", "patientId") `);
    }

}
