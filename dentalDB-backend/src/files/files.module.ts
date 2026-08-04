import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { UPLOADS_DIR } from '../common/utils/uploads-dir.util';
import { v4 as uuid } from 'uuid';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { PatientFile } from './entities/patient-file.entity';
import { PatientsModule } from '../patients/patients.module';
import { BranchesModule } from '../branch/branch.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PatientFile]),
    // Needed by FilesController.assertPatientBranchAccess to look up a
    // patient's branchId and check it against the requesting user's
    // accessible branches — see that method's docstring.
    PatientsModule,
    BranchesModule,
    MulterModule.register({
      storage: diskStorage({
        destination: UPLOADS_DIR,
        filename: (_req, file, cb) => {
          const unique = uuid();
          cb(null, `${unique}${extname(file.originalname)}`);
        },
      }),
      // 40MB — matches the gallery-sync limit in gallery.module.ts. Photos
      // attached here often came straight from the watched-folder gallery
      // (large, lossless PNG x-ray/scan captures), so this needs to stay
      // at least as generous as that path or an image could sync into the
      // gallery fine and then fail right here on the "attach to patient"
      // step instead.
      limits: { fileSize: 40 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowedExts = /\.(jpeg|jpg|png|gif|webp|bmp|tiff|svg|pdf|xlsx|xls|csv|doc|docx|dicom|dcm)$/i;
        const allowedMimes = [
          'image/jpeg','image/jpg','image/png','image/gif','image/webp','image/bmp','image/tiff','image/svg+xml',
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'text/csv','application/csv',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/dicom','application/octet-stream',
        ];
        const extOk  = allowedExts.test(extname(file.originalname).toLowerCase());
        const mimeOk = allowedMimes.includes(file.mimetype);
        const ok = extOk || mimeOk;
        cb(ok ? null : new Error('File type not allowed'), ok);
      },
    }),
  ],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
