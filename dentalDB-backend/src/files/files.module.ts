import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuid } from 'uuid';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { PatientFile } from './entities/patient-file.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PatientFile]),
    MulterModule.register({
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads'),
        filename: (_req, file, cb) => {
          const unique = uuid();
          cb(null, `${unique}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
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
