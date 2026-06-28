import { MigrationInterface, QueryRunner } from "typeorm";

export class BranchLocationAndVisibility1781780415382 implements MigrationInterface {
    name = 'BranchLocationAndVisibility1781780415382'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "branches" ADD "latitude" numeric(10,7)`);
        await queryRunner.query(`ALTER TABLE "branches" ADD "longitude" numeric(10,7)`);
        await queryRunner.query(`ALTER TABLE "branches" ADD "isPubliclyListed" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "branches" DROP COLUMN "isPubliclyListed"`);
        await queryRunner.query(`ALTER TABLE "branches" DROP COLUMN "longitude"`);
        await queryRunner.query(`ALTER TABLE "branches" DROP COLUMN "latitude"`);
    }

}
