import { Controller, Post, Body, Param, Request, UseGuards, Query, Get } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private service: PaymentsService) {}

  // eSewa
  @Post('esewa/init')
  initEsewa(@Request() req, @Body() dto: any) {
    return this.service.initEsewa(req.user.clinicId, dto);
  }

  @Post('esewa/verify')
  verifyEsewa(@Request() req, @Body() dto: any) {
    return this.service.verifyEsewa(req.user.clinicId, dto);
  }

  // Khalti
  @Post('khalti/init')
  initKhalti(@Request() req, @Body() dto: any) {
    return this.service.initKhalti(req.user.clinicId, dto);
  }

  @Post('khalti/verify')
  verifyKhalti(@Request() req, @Body() dto: any) {
    return this.service.verifyKhalti(req.user.clinicId, dto);
  }

  // PayPal
  @Post('paypal/create-order')
  createPaypalOrder(@Request() req, @Body() dto: any) {
    return this.service.createPaypalOrder(req.user.clinicId, dto);
  }

  @Post('paypal/capture/:orderId')
  capturePaypal(@Request() req, @Param('orderId') orderId: string, @Body('invoiceId') invoiceId: string) {
    return this.service.capturePaypalOrder(req.user.clinicId, orderId, invoiceId);
  }
}
