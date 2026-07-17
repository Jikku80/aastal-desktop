import {
  Controller, Get, Patch, Body, Param, Query,
  UseGuards, Request, NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WebsiteOrder, WebsiteOrderStatus } from './entities/website-order.entity';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('website-orders')
export class WebsiteOrdersController {
  constructor(
    @InjectRepository(WebsiteOrder)
    private readonly orderRepo: Repository<WebsiteOrder>,
  ) {}

  @Get()
  @RequirePermissions('website.view')
  async findAll(@Request() req: any, @Query() query: any) {
    const { page = 1, limit = 20, status } = query;
    const clinicId = req.user.clinicId;

    const qb = this.orderRepo
      .createQueryBuilder('o')
      .where('o.clinicId = :clinicId', { clinicId });

    if (status) qb.andWhere('o.status = :status', { status });

    qb.orderBy('o.createdAt', 'DESC');

    const total = await qb.getCount();
    const data  = await qb
      .skip((+page - 1) * +limit)
      .take(+limit)
      .getMany();

    return {
      data,
      total,
      page:  +page,
      limit: +limit,
      pages: Math.ceil(total / +limit),
    };
  }

  @Patch(':id/status')
  @RequirePermissions('website.manage')
  async updateStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { status: WebsiteOrderStatus },
  ) {
    const order = await this.orderRepo.findOne({
      where: { id, clinicId: req.user.clinicId },
    });
    if (!order) throw new NotFoundException('Order not found');
    order.status = body.status;
    return this.orderRepo.save(order);
  }
}