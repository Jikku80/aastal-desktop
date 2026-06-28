import {
  Controller, Get, Post, Delete, Param, Body,
  Request, UseGuards, UseInterceptors, UploadedFile,
  Res, StreamableFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { createReadStream } from 'fs';
import { join } from 'path';
import { extname } from 'path';
import type { Response } from 'express';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FileCategory } from './entities/patient-file.entity';

// ── Image-only upload guard ───────────────────────────────────────────────────
// Used by payment-proof and upload-image endpoints.
// Both ext AND mime must match — checking only one is bypassable.
//
// SVG is intentionally excluded: SVG files can embed arbitrary <script> tags
// and are executed as HTML when served with their native MIME type, making
// them a stored-XSS vector. Use a raster format (png/webp) instead.

const ALLOWED_IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/tiff',
]);

const ALLOWED_IMAGE_EXTS = /\.(jpeg|jpg|png|gif|webp|bmp|tiff)$/i;

const imageOnlyFilter = (
  _req: any,
  file: Express.Multer.File,
  cb: (error: Error | null, accept: boolean) => void,
) => {
  const extOk  = ALLOWED_IMAGE_EXTS.test(extname(file.originalname));
  const mimeOk = ALLOWED_IMAGE_MIMES.has(file.mimetype);
  if (extOk && mimeOk) {
    cb(null, true);
  } else {
    cb(
      new BadRequestException(
        'Only raster image files are allowed (jpeg, png, gif, webp, bmp, tiff). SVG is not accepted.',
      ),
      false,
    );
  }
};

// ─────────────────────────────────────────────────────────────────────────────

@ApiTags('Patient Files')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('files')
export class FilesController {
  constructor(private service: FilesService) {}

  @Post('patients/:patientId')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @Request() req,
    @Param('patientId') patientId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { category?: FileCategory; description?: string },
  ) {
    return this.service.upload(req.user.clinicId, patientId, file, {
      ...body,
      uploadedByUserId: req.user.id,
    });
  }

  /**
   * General-purpose file upload for payment proofs / screenshots.
   * Only raster image files (jpeg, png, gif, webp, bmp, tiff) are accepted.
   * SVG is rejected to prevent stored-XSS via embedded scripts.
   * Returns a public URL the client can store and later show to admins.
   */
  @Post('payment-proof')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', {
    fileFilter: imageOnlyFilter,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  }))
  uploadPaymentProof(
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    const url = `/uploads/${file.filename}`;
    return { url, filename: file.filename, originalName: file.originalname };
  }

  /**
   * General-purpose image upload for website builder (logos, banners, doctor photos, favicons).
   * Only raster image files (jpeg, png, gif, webp, bmp, tiff) are accepted.
   * SVG is rejected to prevent stored-XSS via embedded scripts.
   * No patient association required. Returns a public URL.
   */
  @Post('upload-image')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', {
    fileFilter: imageOnlyFilter,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  }))
  uploadImage(
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    const BASE = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || '';
    const url = `${BASE}/uploads/${file.filename}`;
    return { url, filename: file.filename, originalName: file.originalname };
  }

  @Get('patients/:patientId')
  findByPatient(@Request() req, @Param('patientId') patientId: string) {
    return this.service.findByPatient(req.user.clinicId, patientId);
  }

  @Get(':id/download')
  async download(
    @Request() req,
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const file = await this.service.findOne(req.user.clinicId, id);
    const stream = createReadStream(this.service.getAbsolutePath(file));
    res.set({
      'Content-Type': file.mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(file.originalName)}"`,
    });
    return new StreamableFile(stream);
  }

  @Get(':id/preview')
  async preview(
    @Request() req,
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const file = await this.service.findOne(req.user.clinicId, id);
    const stream = createReadStream(this.service.getAbsolutePath(file));
    res.set({
      'Content-Type': file.mimeType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(file.originalName)}"`,
      'Cache-Control': 'private, max-age=3600',
    });
    return new StreamableFile(stream);
  }

  @Delete(':id')
  delete(@Request() req, @Param('id') id: string) {
    return this.service.delete(req.user.clinicId, id);
  }
}