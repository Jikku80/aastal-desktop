import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClinicWebsite } from '../website-builder/entities/clinic-website.entity';
import { BlogPost }      from './entities/blog-post.entity';
import { SeoRedirect }   from './entities/seo-redirect.entity';
import { User }          from '../users/entities/user.entity';
import { Clinic }        from '../clinics/entities/clinic.entity';
import { SeoService }           from './seo.service';
import { BlogService }          from './blog.service';
import { RedirectService }      from './redirect.service';
import { SeoPublicController }  from './seo-public.controller';
import { BlogAdminController }  from './blog-admin.controller';
import { RedirectAdminController } from './redirect-admin.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ClinicWebsite,
      BlogPost,
      SeoRedirect,
      User,
      Clinic,
    ]),
  ],
  providers:   [SeoService, BlogService, RedirectService],
  controllers: [SeoPublicController, BlogAdminController, RedirectAdminController],
  exports:     [SeoService, BlogService, RedirectService],
})
export class SeoModule {}
