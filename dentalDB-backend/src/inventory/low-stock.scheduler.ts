import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventoryService } from './inventory.service';
import { Product } from './entities/product.entity';
import { PharmacyService } from '../pharmacy/pharmacy.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NotificationType } from '../notifications/entities/notification.entity';
import { User, UserRole } from '../users/entities/user.entity';

@Injectable()
export class LowStockScheduler {
  private readonly logger = new Logger(LowStockScheduler.name);

  constructor(
    private inventoryService: InventoryService,
    private notifications: NotificationsService,
    private gateway: NotificationsGateway,
    @InjectRepository(User) private userRepo: Repository<User>,
    @Inject(forwardRef(() => PharmacyService)) private pharmacyService: PharmacyService,
  ) {}

  /**
   * Pharmaceutical items are checked against usable stock (excludes
   * expired / not-yet-available / depleted batches) instead of raw
   * stockQuantity, per section 10. General items keep using the existing
   * stockQuantity <= reorderPoint check untouched.
   */
  private async findPharmaLowStockGroupedByClinic(): Promise<{ clinicId: string; products: (Product & { displayStock: number })[] }[]> {
    const candidates = await this.inventoryService.findAllPharmaceuticalProductsGroupedByClinic();
    const result: { clinicId: string; products: (Product & { displayStock: number })[] }[] = [];

    for (const { clinicId, products } of candidates) {
      try {
        const usableByProduct = await this.pharmacyService.getUsableStockByProduct(clinicId);
        const low = products
          .map(p => ({ ...p, displayStock: usableByProduct.get(p.id) ?? 0 }))
          .filter(p => p.displayStock <= p.reorderPoint) as (Product & { displayStock: number })[];
        if (low.length) result.push({ clinicId, products: low });
      } catch (e) {
        this.logger.error(`[LowStock] pharma usable-stock check failed for clinic ${clinicId}: ${(e as any)?.message}`);
      }
    }
    return result;
  }

  /** Runs daily at 9:30 AM — finds products at/below reorder point (or, for pharmaceuticals, at/below usable stock), notifies owners */
  @Cron('30 9 * * *')
  async sendLowStockAlerts() {
    this.logger.log('[LowStock] Running daily low-stock alert job');

    const generalGroups = await this.inventoryService.findAllLowStockGroupedByClinic();
    const pharmaGroups = await this.findPharmaLowStockGroupedByClinic();

    const byClinic = new Map<string, (Product & { displayStock?: number })[]>();
    for (const { clinicId, products } of generalGroups) byClinic.set(clinicId, [...products]);
    for (const { clinicId, products } of pharmaGroups) {
      byClinic.set(clinicId, [...(byClinic.get(clinicId) ?? []), ...products]);
    }

    const groups = Array.from(byClinic.entries()).map(([clinicId, products]) => ({ clinicId, products }));

    for (const { clinicId, products } of groups) {
      try {
        const names = products.slice(0, 5).map(p => `${p.name} (${(p as any).displayStock ?? p.stockQuantity})`).join(', ');
        const extra = products.length > 5 ? ` +${products.length - 5} more` : '';

        // Find the clinic owner to target the notification
        const owner = await this.userRepo.findOne({
          where: { clinicId, role: UserRole.OWNER, isActive: true },
        });

        const n = await this.notifications.create({
          clinicId,
          userId: owner?.id ?? undefined,
          type:   NotificationType.SYSTEM,
          title:  `⚠️ ${products.length} product${products.length > 1 ? 's' : ''} low in stock`,
          body:   `${names}${extra} — reorder soon to avoid stockouts.`,
          link:   '/dashboard/inventory',
        });

        this.gateway.emitToClinic(clinicId, 'notification', n);
        this.logger.log(`[LowStock] Notified clinic ${clinicId} — ${products.length} products`);
      } catch (e) {
        this.logger.error(`[LowStock] clinic ${clinicId}: ${e.message}`);
      }
    }
  }
}
