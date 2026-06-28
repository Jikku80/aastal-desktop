import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  Request, UseGuards, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuid } from 'uuid';
import { mkdir } from 'fs/promises';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WebsiteBuilderService } from './website-builder.service';
import { ContactMessage } from './entities/contact-message.entity';
import { Branch } from '../branch/entities/branch.entity';
import { ClinicWebsite } from './entities/clinic-website.entity';
import { Product } from '../inventory/entities/product.entity';

// Ensure upload directories exist at startup
mkdir(join(process.cwd(), 'uploads', 'favicons'),       { recursive: true }).catch(() => {});
mkdir(join(process.cwd(), 'uploads', 'website-images'), { recursive: true }).catch(() => {});

@ApiTags('Website Builder')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('website-builder')
export class WebsiteBuilderController {
  constructor(
    private readonly service: WebsiteBuilderService,
    @InjectRepository(Branch)         private branchRepo:   Repository<Branch>,
    @InjectRepository(ContactMessage) private contactRepo:  Repository<ContactMessage>,
    @InjectRepository(ClinicWebsite)  private websiteRepo:  Repository<ClinicWebsite>,
    @InjectRepository(Product)        private productRepo:  Repository<Product>,
  ) {}

  /** GET current clinic website config */
  @Get()
  find(@Request() req: any) {
    return this.service.find(req.user.clinicId);
  }

  /** GET authenticated preview data */
  @Get('preview')
  async preview(@Request() req: any) {
    const site = await this.service.getForPreview(req.user.clinicId);
    const branches = await this.branchRepo.find({
      where: { clinicId: site.clinicId, isActive: true },
    });
    return {
      website: {
        id:             site.id,
        pages:          site.pages,
        globalSettings: site.globalSettings,
        theme:          site.theme,
        seo:            site.seo,
        subdomain:      site.subdomain,
        customDomain:   site.customDomain,
        isPublished:    site.isPublished,
      },
      clinic: site.clinic ? {
        id:           site.clinic.id,
        name:         site.clinic.name,
        phone:        site.clinic.phone,
        email:        site.clinic.email,
        address:      site.clinic.address,
        city:         site.clinic.city,
        logo:         site.clinic.logo,
        workingHours: site.clinic.workingHours,
      } : null,
      branches: branches.map(b => ({
        id: b.id, name: b.name, address: b.address, phone: b.phone, email: b.email,
      })),
    };
  }

  /** GET products for preview (authenticated, no isPublished requirement) */
  @Get('preview/products')
  async previewProducts(
    @Request() req: any,
    @Query('branchIds') branchIdsParam?: string,
  ) {
    const qb = this.productRepo.createQueryBuilder('p')
      .where('p.clinicId = :clinicId', { clinicId: req.user.clinicId })
      .andWhere('p.isActive = true')
      .orderBy('p.name', 'ASC');

    if (branchIdsParam) {
      const branchIds = branchIdsParam.split(',').map((id: string) => id.trim()).filter(Boolean);
      if (branchIds.length > 0) {
        qb.andWhere('(p.branchId IN (:...branchIds) OR p.branchId IS NULL)', { branchIds });
      }
    }

    const products = await qb.getMany();
    return products.map(p => ({
      id:            p.id,
      name:          p.name,
      description:   p.description,
      price:         p.price,
      stockQuantity: p.stockQuantity,
      unit:          p.unit,
      sku:           p.sku,
      branchId:      p.branchId || null,
      inStock:       p.stockQuantity > 0,
      imageUrl:      p.imageUrl || null,
    }));
  }

  // ── Messages (contact form submissions) ──────────────────────────────────────

  /** GET all contact form messages for this clinic (paginated) */
  @Get('messages')
  async getMessages(
    @Request() req: any,
    @Query('page')  page  = '1',
    @Query('limit') limit = '20',
  ) {
    const take = Math.min(Number(limit) || 20, 100);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

    const [messages, total] = await this.contactRepo.findAndCount({
      where:  { clinicId: req.user.clinicId },
      order:  { createdAt: 'DESC' },
      take,
      skip,
    });

    return {
      data:  messages,
      total,
      page:  Number(page),
      limit: take,
      pages: Math.ceil(total / take),
    };
  }

  /** PATCH mark message as read */
  @Patch('messages/:id/read')
  async markRead(@Request() req: any, @Param('id') id: string) {
    await this.contactRepo.update(
      { id, clinicId: req.user.clinicId },
      { isRead: true },
    );
    return { success: true };
  }

  /** DELETE a message */
  @Delete('messages/:id')
  async deleteMessage(@Request() req: any, @Param('id') id: string) {
    await this.contactRepo.delete({ id, clinicId: req.user.clinicId });
    return { success: true };
  }

  // ── Site CRUD ────────────────────────────────────────────────────────────────

  @Patch()
  update(@Request() req: any, @Body() dto: any) {
    return this.service.update(req.user.clinicId, dto);
  }

  @Post('pages')
  addPage(@Request() req: any, @Body() dto: any) {
    return this.service.addPage(req.user.clinicId, dto);
  }

  @Delete('pages/:pageId')
  deletePage(@Request() req: any, @Param('pageId') pageId: string) {
    return this.service.deletePage(req.user.clinicId, pageId);
  }

  @Patch('pages/reorder')
  reorderPages(@Request() req: any, @Body() dto: { pageIds: string[] }) {
    return this.service.reorderPages(req.user.clinicId, dto.pageIds);
  }

  @Post('pages/:pageId/sections')
  addSection(@Request() req: any, @Param('pageId') pageId: string, @Body() dto: any) {
    return this.service.addSection(req.user.clinicId, pageId, dto.section, dto.position);
  }

  @Patch('pages/:pageId/sections/:sectionId')
  updateSection(
    @Request() req: any,
    @Param('pageId') pageId: string,
    @Param('sectionId') sectionId: string,
    @Body() dto: any,
  ) {
    return this.service.updateSection(req.user.clinicId, pageId, sectionId, dto);
  }

  @Delete('pages/:pageId/sections/:sectionId')
  deleteSection(
    @Request() req: any,
    @Param('pageId') pageId: string,
    @Param('sectionId') sectionId: string,
  ) {
    return this.service.deleteSection(req.user.clinicId, pageId, sectionId);
  }

  @Patch('pages/:pageId/sections/reorder')
  reorderSections(
    @Request() req: any,
    @Param('pageId') pageId: string,
    @Body() dto: { sectionIds: string[] },
  ) {
    return this.service.reorderSections(req.user.clinicId, pageId, dto.sectionIds);
  }

  @Post('pages/:pageId/sections/:sectionId/duplicate')
  duplicateSection(
    @Request() req: any,
    @Param('pageId') pageId: string,
    @Param('sectionId') sectionId: string,
  ) {
    return this.service.duplicateSection(req.user.clinicId, pageId, sectionId);
  }

  @Post('publish')
  publish(@Request() req: any) {
    return this.service.publish(req.user.clinicId);
  }

  @Post('unpublish')
  unpublish(@Request() req: any) {
    return this.service.unpublish(req.user.clinicId);
  }

  @Post('verify-domain')
  verifyDomain(@Request() req: any) {
    return this.service.verifyDomain(req.user.clinicId);
  }

  @Post('generate-ai')
  generateWithAI(@Request() req: any, @Body() dto: any) {
    return this.service.generateWithAI(req.user.clinicId, dto);
  }

  @Post('generate-section')
  generateSection(@Request() req: any, @Body() dto: any) {
    return this.service.generateSectionWithAI(
      req.user.clinicId,
      dto.pageId,
      dto.sectionId,
      dto.sectionType,
      dto.userHint,
    );
  }

  /** POST upload image (for section backgrounds, about images, etc.) */
  @Post('upload-image')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: async (_req, _file, cb) => {
        const dir = join(process.cwd(), 'uploads', 'website-images');
        await mkdir(dir, { recursive: true });
        cb(null, dir);
      },
      filename: (_req, file, cb) => cb(null, `${uuid()}${extname(file.originalname)}`),
    }),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (_req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'), false);
      }
    },
  }))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    const imageUrl = `/uploads/website-images/${file.filename}`;
    return { url: imageUrl };
  }

  /** POST upload favicon */
  @Post('favicon')
  @UseInterceptors(FileInterceptor('favicon', {
    storage: diskStorage({
      destination: join(process.cwd(), 'uploads', 'favicons'),
      filename: (_req, file, cb) => cb(null, `${uuid()}${extname(file.originalname)}`),
    }),
    limits: { fileSize: 2 * 1024 * 1024 },
  }))
  async uploadFavicon(@Request() req: any, @UploadedFile() file: Express.Multer.File) {
    const faviconUrl = `/uploads/favicons/${file.filename}`;
    await this.service.update(req.user.clinicId, { seo: { favicon: faviconUrl } as any });
    return { faviconUrl };
  }
}
