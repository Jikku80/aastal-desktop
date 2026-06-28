import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class SeoInfrastructure1700000000001 implements MigrationInterface {
  name = 'SeoInfrastructure1700000000001';

  public async up(qr: QueryRunner): Promise<void> {
    // ── blog_posts ────────────────────────────────────────────────────────────
    await qr.createTable(
      new Table({
        name: 'blog_posts',
        columns: [
          {
            name: 'id', type: 'uuid', isPrimary: true,
            generationStrategy: 'uuid', default: 'uuid_generate_v4()',
          },
          { name: 'clinicId',           type: 'uuid' },
          { name: 'title',              type: 'varchar' },
          { name: 'slug',               type: 'varchar' },
          { name: 'excerpt',            type: 'text',        isNullable: true },
          { name: 'content',            type: 'text',        isNullable: true },
          { name: 'featuredImage',      type: 'varchar',     isNullable: true },
          { name: 'authorName',         type: 'varchar',     isNullable: true },
          { name: 'authorId',           type: 'varchar',     isNullable: true },
          { name: 'categories',         type: 'text',        isNullable: true },
          { name: 'tags',               type: 'text',        isNullable: true },
          { name: 'status',             type: 'varchar',     default: "'draft'" },
          { name: 'publishedAt',        type: 'timestamptz', isNullable: true },
          { name: 'metaTitle',          type: 'varchar',     isNullable: true },
          { name: 'metaDescription',    type: 'text',        isNullable: true },
          { name: 'metaKeywords',       type: 'text',        isNullable: true },
          { name: 'ogImage',            type: 'varchar',     isNullable: true },
          { name: 'indexable',          type: 'boolean',     default: true },
          { name: 'readingTimeMinutes', type: 'int',         default: 1 },
          { name: 'createdAt',          type: 'timestamptz', default: 'now()' },
          { name: 'updatedAt',          type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    );

    await qr.createIndex(
      'blog_posts',
      new TableIndex({
        name:        'IDX_blog_posts_clinicId_slug',
        columnNames: ['clinicId', 'slug'],
        isUnique:    true,
      }),
    );

    await qr.createIndex(
      'blog_posts',
      new TableIndex({
        name:        'IDX_blog_posts_clinicId_status',
        columnNames: ['clinicId', 'status'],
      }),
    );

    await qr.createForeignKey(
      'blog_posts',
      new TableForeignKey({
        columnNames:           ['clinicId'],
        referencedTableName:   'clinics',
        referencedColumnNames: ['id'],
        onDelete:              'CASCADE',
      }),
    );

    // ── seo_redirects ─────────────────────────────────────────────────────────
    await qr.createTable(
      new Table({
        name: 'seo_redirects',
        columns: [
          {
            name: 'id', type: 'uuid', isPrimary: true,
            generationStrategy: 'uuid', default: 'uuid_generate_v4()',
          },
          { name: 'clinicId',   type: 'uuid' },
          { name: 'fromPath',   type: 'varchar' },
          { name: 'toPath',     type: 'varchar' },
          { name: 'statusCode', type: 'int',         default: 301 },
          { name: 'isActive',   type: 'boolean',     default: true },
          { name: 'createdAt',  type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    );

    await qr.createIndex(
      'seo_redirects',
      new TableIndex({
        name:        'IDX_seo_redirects_clinicId_fromPath',
        columnNames: ['clinicId', 'fromPath'],
        isUnique:    true,
      }),
    );

    await qr.createForeignKey(
      'seo_redirects',
      new TableForeignKey({
        columnNames:           ['clinicId'],
        referencedTableName:   'clinics',
        referencedColumnNames: ['id'],
        onDelete:              'CASCADE',
      }),
    );

    await qr.query(`
      COMMENT ON COLUMN clinic_websites.seo IS
      'SEO config: title, description, keywords[], ogImage,
       googleAnalyticsId, googleTagManagerId, facebookPixelId,
       googleSiteVerification, bingSiteVerification, yandexVerification,
       city, country, latitude, longitude, clinicType,
       aggregateRating{ratingValue,reviewCount},
       noindex, canonicalDomain';
    `).catch(() => { /* ignore if DB does not support comments */ });
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.dropTable('seo_redirects', true);
    await qr.dropTable('blog_posts',    true);
  }
}
