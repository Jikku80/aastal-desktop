import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventoryService } from './inventory.service';
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
  ) {}

  /** Runs daily at 9:30 AM — finds products at/below reorder point, notifies owners */
  @Cron('30 9 * * *')
  async sendLowStockAlerts() {
    this.logger.log('[LowStock] Running daily low-stock alert job');

    const groups = await this.inventoryService.findAllLowStockGroupedByClinic();

    for (const { clinicId, products } of groups) {
      try {
        const names = products.slice(0, 5).map(p => `${p.name} (${p.stockQuantity})`).join(', ');
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
