import { MigrationInterface, QueryRunner } from "typeorm";

// SQLite/offline counterpart of 1784500000000-IndependentDoctorRoleScope
// (postgres). Adds the same roles.doctorUserId scope column so the
// entity stays valid across both drivers. Plain ADD COLUMN, no FK —
// same pattern used for other optional foreign-key-ish columns added
// via migration in this set (see RecordsBranchScoping), since SQLite
// can't add a FK constraint without a full table rebuild.
//
// audit_logs.clinicId is left NOT NULL here on purpose: independent
// doctor self-signup is a hosted-backend-only (marketplace/discovery)
// feature and isn't exercised through the offline/desktop SQLite path,
// so there's no equivalent not-null violation to fix on this driver.
export class IndependentDoctorRoleScope1784500000000 implements MigrationInterface {
    name = 'IndependentDoctorRoleScope1784500000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "roles" ADD COLUMN "doctorUserId" varchar`);
        await queryRunner.query(`CREATE INDEX "IDX_roles_doctorUserId" ON "roles" ("doctorUserId")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_roles_doctorUserId"`);
        await queryRunner.query(`ALTER TABLE "roles" DROP COLUMN "doctorUserId"`);
    }

}
