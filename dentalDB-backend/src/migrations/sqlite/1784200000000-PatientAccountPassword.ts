import { MigrationInterface, QueryRunner } from "typeorm";

export class PatientAccountPassword1784200000000 implements MigrationInterface {
    name = 'PatientAccountPassword1784200000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "patient_accounts" ADD "password" varchar`);
        await queryRunner.query(`ALTER TABLE "patient_accounts" ADD "hasPassword" boolean NOT NULL DEFAULT (0)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "patient_accounts" DROP COLUMN "hasPassword"`);
        await queryRunner.query(`ALTER TABLE "patient_accounts" DROP COLUMN "password"`);
    }

}