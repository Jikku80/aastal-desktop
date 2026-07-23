import { MigrationInterface, QueryRunner } from "typeorm";

export class RecordsBranchScoping1784400000000 implements MigrationInterface {
    name = 'RecordsBranchScoping1784400000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // SQLite ADD COLUMN can't carry a FK constraint without a full table
        // rebuild; branchId is nullable and application-enforced here, same
        // as other optional foreign-key-ish columns added via plain
        // ADD COLUMN elsewhere in this migration set.
        await queryRunner.query(`ALTER TABLE "clinical_records" ADD COLUMN "branchId" varchar`);
        await queryRunner.query(`CREATE INDEX "IDX_clinical_records_branchId" ON "clinical_records" ("branchId")`);

        await queryRunner.query(`ALTER TABLE "blood_tests" ADD COLUMN "branchId" varchar`);
        await queryRunner.query(`CREATE INDEX "IDX_blood_tests_branchId" ON "blood_tests" ("branchId")`);

        await queryRunner.query(`ALTER TABLE "lab_works" ADD COLUMN "branchId" varchar`);
        await queryRunner.query(`CREATE INDEX "IDX_lab_works_branchId" ON "lab_works" ("branchId")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_lab_works_branchId"`);
        await queryRunner.query(`ALTER TABLE "lab_works" DROP COLUMN "branchId"`);

        await queryRunner.query(`DROP INDEX "IDX_blood_tests_branchId"`);
        await queryRunner.query(`ALTER TABLE "blood_tests" DROP COLUMN "branchId"`);

        await queryRunner.query(`DROP INDEX "IDX_clinical_records_branchId"`);
        await queryRunner.query(`ALTER TABLE "clinical_records" DROP COLUMN "branchId"`);
    }

}
