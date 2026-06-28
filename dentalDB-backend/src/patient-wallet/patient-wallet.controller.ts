import {
  Controller, Get, Post, Param, Body, Query, Request, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PatientWalletService } from './patient-wallet.service';

@UseGuards(JwtAuthGuard)
@Controller('patient-wallet')
export class PatientWalletController {
  constructor(private svc: PatientWalletService) {}

  @Get(':patientId')
  getBalance(@Request() req: any, @Param('patientId') patientId: string) {
    return this.svc.getBalance(req.user.clinicId, patientId);
  }

  @Get(':patientId/transactions')
  getTransactions(@Request() req: any, @Param('patientId') patientId: string, @Query() query: any) {
    return this.svc.getTransactions(req.user.clinicId, patientId, query);
  }

  @Post(':patientId/credit')
  credit(@Request() req: any, @Param('patientId') patientId: string, @Body() body: { amount: number; description: string }) {
    return this.svc.credit(req.user.clinicId, patientId, body.amount, body.description, req.user.id);
  }

  @Post(':patientId/apply-to-invoice')
  applyToInvoice(@Request() req: any, @Param('patientId') patientId: string, @Body() body: { invoiceId: string; amount: number }) {
    return this.svc.applyToInvoice(req.user.clinicId, patientId, body.invoiceId, body.amount, req.user.id);
  }
}
