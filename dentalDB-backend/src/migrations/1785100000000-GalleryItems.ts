import { MigrationInterface, QueryRunner } from "typeorm";

// Creates gallery_items — see gallery/entities/gallery-item.entity.ts.
// Online-only (Postgres) table: photos pushed up from a branch's desktop
// capture machine via electron/gallery-sync.js, so the web app can show a
// branch-specific gallery too. NOT registered in database/offline-entities.ts
// or sync/sync-registry.ts — the desktop app never queries this table
// itself (it has its own local JSON manifest, see electron/gallery-store.js),
// it only ever POSTs into it.
export class GalleryItems1785100000000 implements MigrationInterface {
    name = 'GalleryItems1785100000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "gallery_items" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "clinicId" uuid NOT NULL,
                "branchId" uuid NOT NULL,
                "fileName" character varying NOT NULL,
                "storedName" character varying NOT NULL,
                "mimeType" character varying NOT NULL,
                "size" bigint NOT NULL,
                "deviceId" uuid,
                "capturedAt" TIMESTAMP,
                "attachedPatientId" uuid,
                "attachedAt" TIMESTAMP,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_gallery_items_id" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            ALTER TABLE "gallery_items"
            ADD CONSTRAINT "FK_gallery_items_clinicId" FOREIGN KEY ("clinicId")
            REFERENCES "clinics"("id") ON DELETE CASCADE
        `);
        await queryRunner.query(`
            ALTER TABLE "gallery_items"
            ADD CONSTRAINT "FK_gallery_items_branchId" FOREIGN KEY ("branchId")
            REFERENCES "branches"("id") ON DELETE CASCADE
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_gallery_items_clinic_branch" ON "gallery_items" ("clinicId", "branchId")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_gallery_items_clinic_branch"`);
        await queryRunner.query(`ALTER TABLE "gallery_items" DROP CONSTRAINT "FK_gallery_items_branchId"`);
        await queryRunner.query(`ALTER TABLE "gallery_items" DROP CONSTRAINT "FK_gallery_items_clinicId"`);
        await queryRunner.query(`DROP TABLE "gallery_items"`);
    }
}
