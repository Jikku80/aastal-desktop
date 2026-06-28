import {
  Controller, Get, Post, Patch, Param, Body, Query, Request,
  UseGuards, Res,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PayrollService } from './payroll.service';

@UseGuards(JwtAuthGuard)
@Controller('payroll')
export class PayrollController {
  constructor(private svc: PayrollService) {}

  // ─── Deduction rules ──────────────────────────────────────────────────────

  /** GET /payroll/deduction-rules — fetch clinic rules (returns defaults if none set) */
  @Get('deduction-rules')
  getDeductionRules(@Request() req: any) {
    return this.svc.getDeductionRule(req.user.clinicId);
  }

  /** PATCH /payroll/deduction-rules — upsert clinic rules */
  @Patch('deduction-rules')
  upsertDeductionRules(@Request() req: any, @Body() body: any) {
    return this.svc.upsertDeductionRule(req.user.clinicId, req.user.id, body);
  }

  // ─── Runs ─────────────────────────────────────────────────────────────────

  @Post('calculate')
  calculate(@Request() req: any, @Body() body: any) {
    return this.svc.calculateRun(req.user.clinicId, req.user.id, body);
  }

  @Get()
  listRuns(@Request() req: any, @Query() query: any) {
    return this.svc.listRuns(req.user.clinicId, query);
  }

  @Get(':runId')
  getRunSummary(@Request() req: any, @Param('runId') runId: string) {
    return this.svc.getRunSummary(req.user.clinicId, runId);
  }

  @Patch(':runId/finalize')
  finalize(@Request() req: any, @Param('runId') runId: string) {
    return this.svc.finalizeRun(req.user.clinicId, runId, req.user.id);
  }

  @Patch(':runId/paid')
  markPaid(@Request() req: any, @Param('runId') runId: string) {
    return this.svc.markPaid(req.user.clinicId, runId, req.user.id);
  }

  // ─── FIX #3: per-entry deduction editing ─────────────────────────────────

  /** PATCH /payroll/:runId/entries/:entryId — adjust deductions/bonus for one staff */
  @Patch(':runId/entries/:entryId')
  updateEntry(
    @Request() req: any,
    @Param('runId') runId: string,
    @Param('entryId') entryId: string,
    @Body() body: {
      taxDeduction?: number;
      otherDeductions?: number;
      bonus?: number;
      allowances?: number;
      notes?: string;
    },
  ) {
    return this.svc.updateEntry(req.user.clinicId, runId, entryId, req.user.id, body);
  }

  // ─── Payslip ──────────────────────────────────────────────────────────────

  @Get(':runId/entries/:entryId/payslip')
  async downloadPayslip(
    @Request() req: any,
    @Param('runId') runId: string,
    @Param('entryId') entryId: string,
    @Res() res: Response,
  ) {
    const pdf = await this.svc.generatePayslipPdf(req.user.clinicId, entryId);
    res.set({
      'Content-Type': 'text/html',
      'Content-Disposition': `attachment; filename="payslip-${entryId}.html"`,
    });
    res.send(pdf);
  }
}
