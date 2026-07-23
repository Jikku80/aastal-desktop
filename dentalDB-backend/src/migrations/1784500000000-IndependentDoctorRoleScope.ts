import { MigrationInterface, QueryRunner } from "typeorm";

// Fixes independent-doctor signup/login:
//
// 1) RbacService.ensureIndependentDoctorRole used to store a synthetic
//    scope key ("independent:<userId>") in roles.clinicId to give each
//    independent doctor a personal role. roles.clinicId is a uuid FK
//    column, so that write always failed ("invalid input syntax for type
//    uuid"), silently (caught + logged as a warning) — meaning every
//    independent doctor ended up with zero RBAC permissions after signup.
//    This adds a dedicated nullable roles.doctorUserId column for that
//    personal scope instead of overloading clinicId.
//
// 2) audit_logs.clinicId was NOT NULL, but independent doctors have no
//    clinic — every signup/login audit event for them failed the
//    not-null constraint (caught + logged as an error by AuditService,
//    so it didn't crash the request, but no audit trail was ever
//    written for these users). Made nullable.
export class IndependentDoctorRoleScope1784500000000 implements MigrationInterface {
    name = 'IndependentDoctorRoleScope1784500000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "roles" ADD "doctorUserId" uuid`);
        await queryRunner.query(`CREATE INDEX "IDX_roles_doctorUserId" ON "roles" ("doctorUserId")`);
        await queryRunner.query(`ALTER TABLE "roles" ADD CONSTRAINT "FK_roles_doctorUserId" FOREIGN KEY ("doctorUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);

        await queryRunner.query(`ALTER TABLE "audit_logs" ALTER COLUMN "clinicId" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "audit_logs" ALTER COLUMN "clinicId" SET NOT NULL`);

        await queryRunner.query(`ALTER TABLE "roles" DROP CONSTRAINT "FK_roles_doctorUserId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_roles_doctorUserId"`);
        await queryRunner.query(`ALTER TABLE "roles" DROP COLUMN "doctorUserId"`);
    }

}
