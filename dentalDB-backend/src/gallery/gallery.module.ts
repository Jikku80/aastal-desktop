import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuid } from 'uuid';
import { UPLOADS_DIR } from '../common/utils/uploads-dir.util';
import { GalleryController } from './gallery.controller';
import { GalleryService } from './gallery.service';
import { GalleryItem } from './entities/gallery-item.entity';
import { BranchesModule } from '../branch/branch.module';
import { SyncModule } from '../sync/sync.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([GalleryItem]),
    // SyncModule exports SyncDeviceGuard so POST /gallery/sync can reuse
    // the exact same per-device auth as the rest of /sync/* (see
    // SyncDeviceGuard's docstring) — this is the desktop app's own
    // gallery-sync.js pushing into this endpoint, not a browser.
    SyncModule,
    // BranchesService.getAccessibleBranchIds is what scopes every list/
    // preview/attach/delete endpoint below to only the branches a given
    // user is actually assigned to.
    BranchesModule,
    MulterModule.register({
      storage: diskStorage({
        destination: UPLOADS_DIR,
        filename: (_req, file, cb) => cb(null, `${uuid()}${extname(file.originalname)}`),
      }),
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  ],
  controllers: [GalleryController],
  providers: [GalleryService],
  exports: [GalleryService],
})
export class GalleryModule {}
