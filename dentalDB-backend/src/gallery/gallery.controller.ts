import {
  Controller, Get, Post, Delete, Param, Body, Query,
  Request, UseGuards, UseInterceptors, UploadedFile,
  Res, StreamableFile, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { createReadStream } from 'fs';
import type { Response } from 'express';
import { GalleryService } from './gallery.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SyncDeviceGuard } from '../sync/guards/sync-device.guard';
import { BranchesService } from '../branch/branch.service';

@ApiTags('Gallery')
@Controller('gallery')
export class GalleryController {
  constructor(
    private readonly gallery: GalleryService,
    private readonly branchesService: BranchesService,
  ) {}

  /**
   * Every branch photo, scoped to whichever branches the requesting user
   * is actually allowed to see — an owner/super_admin sees every branch;
   * anyone else only sees the branch(es) they're assigned to. Pass
   * ?branchId=... to narrow to one specific (accessible) branch, the same
   * way PatientFilesPanel's gallery picker already does on desktop.
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async list(@Request() req, @Query('branchId') branchId?: string) {
    const { id: userId, clinicId, role } = req.user;
    const accessible = await this.branchesService.getAccessibleBranchIds(clinicId, userId, role);
    if (accessible.length === 0) return [];

    const scoped = branchId
      ? (accessible.includes(branchId) ? [branchId] : [])
      : accessible;
    return this.gallery.findByBranches(clinicId, scoped);
  }

  @Get(':id/preview')
  @UseGuards(JwtAuthGuard)
  async preview(@Request() req, @Param('id') id: string, @Res({ passthrough: true }) res: Response): Promise<StreamableFile> {
    const { id: userId, clinicId, role } = req.user;
    const accessible = await this.branchesService.getAccessibleBranchIds(clinicId, userId, role);
    const item = await this.gallery.findOneForBranches(clinicId, id, accessible);
    const stream = createReadStream(this.gallery.getAbsolutePath(item));
    res.set({
      'Content-Type': item.mimeType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(item.fileName)}"`,
      'Cache-Control': 'private, max-age=3600',
    });
    return new StreamableFile(stream);
  }

  /**
   * Marks a gallery item attached — called once the web GalleryPickerModal
   * flow has actually uploaded the image as a real PatientFile (see
   * PatientFilesPanel.handleGalleryAttach), so it drops out of the picker
   * next time. Branch-scoped exactly like the endpoints above: a user
   * cannot attach a photo from a branch they don't have access to.
   */
  @Post(':id/attach')
  @UseGuards(JwtAuthGuard)
  async attach(@Request() req, @Param('id') id: string, @Body() body: { patientId: string }) {
    if (!body?.patientId) throw new BadRequestException('patientId is required');
    const { id: userId, clinicId, role } = req.user;
    const accessible = await this.branchesService.getAccessibleBranchIds(clinicId, userId, role);
    await this.gallery.findOneForBranches(clinicId, id, accessible); // throws if not accessible
    return this.gallery.markAttached(clinicId, id, body.patientId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Request() req, @Param('id') id: string) {
    const { id: userId, clinicId, role } = req.user;
    const accessible = await this.branchesService.getAccessibleBranchIds(clinicId, userId, role);
    await this.gallery.findOneForBranches(clinicId, id, accessible); // throws if not accessible
    await this.gallery.delete(clinicId, id);
    return { ok: true };
  }

  /**
   * Server-role endpoint — the desktop app's gallery-sync.js calls this to
   * push a newly-captured photo up so it's visible from the web too.
   * Device-token guarded exactly like the rest of /sync/* (SyncDeviceGuard
   * resolves req.syncClinicId from the caller's per-device token); the
   * branch itself comes from the request body since a single device token
   * belongs to a whole desktop install, not one specific branch — the
   * desktop app already scopes each watched folder to its own branch
   * (see electron/watched-folder.js) and reports it here directly.
   */
  @Post('sync')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseGuards(SyncDeviceGuard)
  // Kept in sync with the MulterModule-level limit in gallery.module.ts and
  // electron/gallery-sync.js's MAX_PUSH_SIZE — see the comment there for
  // why this was raised from 20MB (large, lossless PNG captures were
  // silently hitting the old cap on every retry).
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 40 * 1024 * 1024 } }))
  async syncPush(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { branchId?: string; branchName?: string; fileName?: string; capturedAt?: string },
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    if (!body?.branchId) throw new BadRequestException('branchId is required');

    // A device token only proves which CLINIC the caller belongs to, not
    // which branch — verify the claimed branch actually belongs to that
    // clinic before writing anything, so a compromised/misconfigured
    // device token for one branch's machine can't be used to write into
    // another branch (or, since the guard already scopes clinicId,
    // another clinic entirely — but the branch check still matters
    // within a multi-branch clinic).
    const branches = await this.branchesService.findAll(req.syncClinicId);
    const validBranch = branches.some((b) => b.id === body.branchId);
    if (!validBranch) throw new ForbiddenException('Unknown branch for this clinic');

    return this.gallery.create({
      clinicId: req.syncClinicId,
      branchId: body.branchId,
      fileName: body.fileName || file.originalname,
      storedName: file.filename,
      mimeType: file.mimetype,
      size: file.size,
      deviceId: req.syncDeviceId,
      capturedAt: body.capturedAt ? new Date(body.capturedAt) : new Date(),
    });
  }
}
