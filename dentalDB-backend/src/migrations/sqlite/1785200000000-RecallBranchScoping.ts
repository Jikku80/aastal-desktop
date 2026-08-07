import { MigrationInterface, QueryRunner } from "typeorm";

export class RecallBranchScoping1785200000000 implements MigrationInterface {
    name = 'RecallBranchScoping1785200000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // SQLite ADD COLUMN can't carry a FK constraint without a full table
        // rebuild; branchId is nullable and application-enforced here, same
        // as RecordsBranchScoping did for clinical_records/blood_tests/lab_works.
        await queryRunner.query(`ALTER TABLE "recalls" ADD COLUMN "branchId" varchar`);
        await queryRunner.query(`CREATE INDEX "IDX_recalls_branchId" ON "recalls" ("branchId")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_recalls_branchId"`);
        await queryRunner.query(`ALTER TABLE "recalls" DROP COLUMN "branchId"`);
    }

}
