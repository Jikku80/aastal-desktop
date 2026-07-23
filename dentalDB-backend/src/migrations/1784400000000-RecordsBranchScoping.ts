import { MigrationInterface, QueryRunner } from "typeorm";

export class RecordsBranchScoping1784400000000 implements MigrationInterface {
    name = 'RecordsBranchScoping1784400000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Records/lab-work/blood-tests had no branchId at all, so the
        // Records, Lab Results and Blood Test pages could never be scoped
        // to a branch the way Appointments/Invoices already are.
        await queryRunner.query(`ALTER TABLE "clinical_records" ADD "branchId" character varying`);
        await queryRunner.query(`CREATE INDEX "IDX_clinical_records_branchId" ON "clinical_records" ("branchId")`);
        await queryRunner.query(`ALTER TABLE "clinical_records" ADD CONSTRAINT "FK_clinical_records_branchId" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);

        await queryRunner.query(`ALTER TABLE "blood_tests" ADD "branchId" character varying`);
        await queryRunner.query(`CREATE INDEX "IDX_blood_tests_branchId" ON "blood_tests" ("branchId")`);
        await queryRunner.query(`ALTER TABLE "blood_tests" ADD CONSTRAINT "FK_blood_tests_branchId" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);

        await queryRunner.query(`ALTER TABLE "lab_works" ADD "branchId" character varying`);
        await queryRunner.query(`CREATE INDEX "IDX_lab_works_branchId" ON "lab_works" ("branchId")`);
        await queryRunner.query(`ALTER TABLE "lab_works" ADD CONSTRAINT "FK_lab_works_branchId" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lab_works" DROP CONSTRAINT "FK_lab_works_branchId"`);
        await queryRunner.query(`DROP INDEX "IDX_lab_works_branchId"`);
        await queryRunner.query(`ALTER TABLE "lab_works" DROP COLUMN "branchId"`);

        await queryRunner.query(`ALTER TABLE "blood_tests" DROP CONSTRAINT "FK_blood_tests_branchId"`);
        await queryRunner.query(`DROP INDEX "IDX_blood_tests_branchId"`);
        await queryRunner.query(`ALTER TABLE "blood_tests" DROP COLUMN "branchId"`);

        await queryRunner.query(`ALTER TABLE "clinical_records" DROP CONSTRAINT "FK_clinical_records_branchId"`);
        await queryRunner.query(`DROP INDEX "IDX_clinical_records_branchId"`);
        await queryRunner.query(`ALTER TABLE "clinical_records" DROP COLUMN "branchId"`);
    }

}
