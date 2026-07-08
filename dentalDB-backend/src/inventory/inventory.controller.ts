import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, Request, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { UPLOADS_DIR } from '../common/utils/uploads-dir.util';
import { v4 as uuid } from 'uuid';
import { InventoryService } from './inventory.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { CreatePurchaseOrderDto, UpdatePurchaseOrderDto } from './dto/purchase-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly svc: InventoryService) {}

  // ── Products ──────────────────────────────────────────────────────────────
  // IMPORTANT: static routes (/low-stock) must come BEFORE /:id

  @Post()
  create(@Request() req: any, @Body() dto: CreateProductDto) {
    return this.svc.create(req.user.clinicId, dto);
  }

  @Get('low-stock')
  findLowStock(@Request() req: any) {
    return this.svc.findLowStock(req.user.clinicId);
  }

  @Get()
  findAll(@Request() req: any, @Query() query: any) {
    return this.svc.findAll(req.user.clinicId, query);
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.svc.findOne(req.user.clinicId, id);
  }

  @Patch(':id')
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.svc.update(req.user.clinicId, id, dto);
  }

  @Delete(':id')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.svc.remove(req.user.clinicId, id);
  }

  /** Upload product image — returns { imageUrl } */
  @Post(':id/image')
  @UseInterceptors(FileInterceptor('image', {
    storage: diskStorage({
      destination: join(UPLOADS_DIR, 'products'),
      filename: (_req, file, cb) => cb(null, `product-${uuid()}${extname(file.originalname)}`),
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const ok = /\.(jpg|jpeg|png|webp)$/i.test(extname(file.originalname));
      cb(ok ? null : new Error('Only image files allowed') as any, ok);
    },
  }))
  async uploadImage(
    @Request() req: any,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const imageUrl = `/uploads/products/${file.filename}`;
    await this.svc.update(req.user.clinicId, id, { imageUrl });
    return { imageUrl };
  }
}

// ── Purchase Orders — separate controller to avoid /:id route collision ──────

@UseGuards(JwtAuthGuard)
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly svc: InventoryService) {}

  @Post()
  create(@Request() req: any, @Body() dto: CreatePurchaseOrderDto) {
    return this.svc.createPO(req.user.clinicId, dto);
  }

  @Get()
  findAll(@Request() req: any) {
    return this.svc.findAllPOs(req.user.clinicId);
  }

  @Patch(':id')
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdatePurchaseOrderDto) {
    return this.svc.updatePOStatus(req.user.clinicId, id, dto, req.user.id);
  }

  @Delete(':id')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.svc.deletePO(req.user.clinicId, id);
  }
}
