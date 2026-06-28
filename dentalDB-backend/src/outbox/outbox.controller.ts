import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { OutboxService } from './outbox.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('outbox')
@UseGuards(JwtAuthGuard)
export class OutboxController {
  constructor(private readonly outbox: OutboxService) {}

  /** Used by Phase 5 UI to render "queued, will send when online" indicators. */
  @Get('status')
  async status() {
    return this.outbox.countByStatus();
  }

  @Get('pending')
  async pending() {
    return this.outbox.listPending();
  }

  /** Manual drain trigger (debugging / "retry now" button) — normally driven by connectivity events, see sync module. */
  @Post('drain')
  async drain() {
    return this.outbox.drain();
  }
}
