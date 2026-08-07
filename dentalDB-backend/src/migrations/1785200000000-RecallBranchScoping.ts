import { MigrationInterface, QueryRunner } from "typeorm";

export class RecallBranchScoping1785200000000 implements MigrationInterface {
    name = 'RecallBranchScoping1785200000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "recalls" ADD "branchId" uuid`);
        await queryRunner.query(`CREATE INDEX "IDX_recalls_branchId" ON "recalls" ("branchId")`);
        await queryRunner.query(`ALTER TABLE "recalls" ADD CONSTRAINT "FK_recalls_branchId" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "recalls" DROP CONSTRAINT "FK_recalls_branchId"`);
        await queryRunner.query(`DROP INDEX "IDX_recalls_branchId"`);
        await queryRunner.query(`ALTER TABLE "recalls" DROP COLUMN "branchId"`);
    }
}