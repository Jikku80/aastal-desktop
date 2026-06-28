import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1780739600415 implements MigrationInterface {
    name = 'Migration1780739600415'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "seo_redirects" DROP CONSTRAINT "FK_3dd581bbe509d820b57316a1818"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_seo_redirects_clinicId_fromPath"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_blog_posts_clinicId_slug"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_blog_posts_clinicId_status"`);
        await queryRunner.query(`COMMENT ON COLUMN "clinic_websites"."seo" IS NULL`);
        await queryRunner.query(`ALTER TABLE "seo_redirects" DROP COLUMN "clinicId"`);
        await queryRunner.query(`ALTER TABLE "seo_redirects" ADD "clinicId" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "seo_redirects" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "seo_redirects" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "blog_posts" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "blog_posts" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "blog_posts" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "blog_posts" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "payroll_deduction_rules" ALTER COLUMN "halfDayDeductionRate" SET DEFAULT '0.5'`);
        await queryRunner.query(`ALTER TABLE "payroll_deduction_rules" ALTER COLUMN "overtimeRateMultiplier" SET DEFAULT '1.5'`);
        await queryRunner.query(`ALTER TABLE "invoices" ALTER COLUMN "invoiceUuid" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "invoices" ALTER COLUMN "invoiceUuid" SET DEFAULT gen_random_uuid()`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_b1ffc61ecdd52902f3a86096f9" ON "seo_redirects" ("clinicId", "fromPath") `);
        await queryRunner.query(`CREATE INDEX "IDX_2bd61f9ef87924cb5db1e415d6" ON "blog_posts" ("clinicId", "status") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_801285e4da015ed6d284bbb02c" ON "blog_posts" ("clinicId", "slug") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_801285e4da015ed6d284bbb02c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2bd61f9ef87924cb5db1e415d6"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b1ffc61ecdd52902f3a86096f9"`);
        await queryRunner.query(`ALTER TABLE "invoices" ALTER COLUMN "invoiceUuid" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "invoices" ALTER COLUMN "invoiceUuid" SET DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "payroll_deduction_rules" ALTER COLUMN "overtimeRateMultiplier" SET DEFAULT 1.5`);
        await queryRunner.query(`ALTER TABLE "payroll_deduction_rules" ALTER COLUMN "halfDayDeductionRate" SET DEFAULT 0.5`);
        await queryRunner.query(`ALTER TABLE "blog_posts" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "blog_posts" ADD "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "blog_posts" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "blog_posts" ADD "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "seo_redirects" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "seo_redirects" ADD "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "seo_redirects" DROP COLUMN "clinicId"`);
        await queryRunner.query(`ALTER TABLE "seo_redirects" ADD "clinicId" uuid NOT NULL`);
        await queryRunner.query(`COMMENT ON COLUMN "clinic_websites"."seo" IS 'SEO config: title, description, keywords[], ogImage,
       googleAnalyticsId, googleTagManagerId, facebookPixelId,
       googleSiteVerification, bingSiteVerification, yandexVerification,
       city, country, latitude, longitude, clinicType,
       aggregateRating{ratingValue,reviewCount},
       noindex, canonicalDomain'`);
        await queryRunner.query(`CREATE INDEX "IDX_blog_posts_clinicId_status" ON "blog_posts" ("clinicId", "status") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_blog_posts_clinicId_slug" ON "blog_posts" ("clinicId", "slug") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_seo_redirects_clinicId_fromPath" ON "seo_redirects" ("clinicId", "fromPath") `);
        await queryRunner.query(`ALTER TABLE "seo_redirects" ADD CONSTRAINT "FK_3dd581bbe509d820b57316a1818" FOREIGN KEY ("clinicId") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
