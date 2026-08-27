import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, Request, UseGuards, Res, StreamableFile,
} from '@nestjs/common';
import { Response } from 'express';
import { Readable } from 'stream';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { CoaService } from './coa.service';
import { JournalService } from './journal.service';
import { StatementsService } from './statements.service';
import { PeriodService } from './period.service';
import { FinancePdfService } from './finance-pdf.service';
import {
  CreateAccountDto, UpdateAccountDto, CreateManualJournalEntryDto, ClosePeriodDto,
} from './dto/finance.dto';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('finance')
export class FinanceController {
  constructor(
    private coaService: CoaService,
    private journalService: JournalService,
    private statementsService: StatementsService,
    private periodService: PeriodService,
    private pdfService: FinancePdfService,
  ) {}

  // ── Chart of Accounts ────────────────────────────────────────────────────

  @Post('accounts/seed')
  @RequirePermissions('finance.manage_accounts')
  seedCoa(@Request() req: any) {
    return this.coaService.seedDefaultCoa(req.user.clinicId);
  }

  @Get('accounts')
  @RequirePermissions('finance.view_ledger')
  listAccounts(@Request() req: any, @Query() query: any) {
    return this.coaService.list(req.user.clinicId, query);
  }

  @Post('accounts')
  @RequirePermissions('finance.manage_accounts')
  createAccount(@Request() req: any, @Body() dto: CreateAccountDto) {
    return this.coaService.create(req.user.clinicId, dto, req.user.id);
  }

  @Patch('accounts/:id')
  @RequirePermissions('finance.manage_accounts')
  updateAccount(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateAccountDto) {
    return this.coaService.update(req.user.clinicId, id, dto, req.user.id);
  }

  @Delete('accounts/:id')
  @RequirePermissions('finance.manage_accounts')
  deleteAccount(@Request() req: any, @Param('id') id: string) {
    return this.coaService.remove(req.user.clinicId, id, req.user.id);
  }

  // ── Journal ───────────────────────────────────────────────────────────────

  @Get('journal-entries')
  @RequirePermissions('finance.view_ledger')
  listEntries(@Request() req: any, @Query() query: any) {
    return this.journalService.findEntries(req.user.clinicId, query);
  }

  @Get('journal-entries/:id')
  @RequirePermissions('finance.view_ledger')
  getEntry(@Request() req: any, @Param('id') id: string) {
    return this.journalService.findOne(req.user.clinicId, id);
  }

  @Post('journal-entries')
  @RequirePermissions('finance.post_journal_entry')
  postManual(@Request() req: any, @Body() dto: CreateManualJournalEntryDto) {
    return this.journalService.postManual(req.user.clinicId, dto, req.user.id);
  }

  @Post('journal-entries/:id/reverse')
  @RequirePermissions('finance.post_journal_entry')
  reverse(@Request() req: any, @Param('id') id: string) {
    return this.journalService.reverseManualEntry(req.user.clinicId, id, req.user.id);
  }

  // ── Ledger & Trial Balance ───────────────────────────────────────────────

  @Get('ledger/:accountId')
  @RequirePermissions('finance.view_ledger')
  getLedger(@Request() req: any, @Param('accountId') accountId: string, @Query() query: any) {
    return this.statementsService.getLedger(req.user.clinicId, accountId, query);
  }

  @Get('trial-balance')
  @RequirePermissions('finance.view_ledger')
  getTrialBalance(@Request() req: any, @Query() query: any) {
    return this.statementsService.getTrialBalance(req.user.clinicId, query);
  }

  @Get('trial-balance/pdf')
  @RequirePermissions('finance.view_statements')
  async trialBalancePdf(@Request() req: any, @Query() query: any, @Res({ passthrough: true }) res: Response): Promise<StreamableFile> {
    const buf = await this.pdfService.generateTrialBalancePdf(req.user.clinicId, query.dateTo, query.branchId);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="Trial-Balance.pdf"', 'Content-Length': buf.length });
    return new StreamableFile(Readable.from(buf));
  }

  // ── Financial Statements ─────────────────────────────────────────────────

  @Get('statements/balance-sheet')
  @RequirePermissions('finance.view_statements')
  getBalanceSheet(@Request() req: any, @Query() query: any) {
    return this.statementsService.getBalanceSheet(req.user.clinicId, query);
  }

  @Get('statements/balance-sheet/pdf')
  @RequirePermissions('finance.view_statements')
  async balanceSheetPdf(@Request() req: any, @Query() query: any, @Res({ passthrough: true }) res: Response): Promise<StreamableFile> {
    const buf = await this.pdfService.generateBalanceSheetPdf(req.user.clinicId, query.asOfDate, query.branchId);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="Balance-Sheet.pdf"', 'Content-Length': buf.length });
    return new StreamableFile(Readable.from(buf));
  }

  @Get('statements/profit-loss')
  @RequirePermissions('finance.view_statements')
  getProfitLoss(@Request() req: any, @Query() query: any) {
    return this.statementsService.getProfitAndLoss(req.user.clinicId, query);
  }

  @Get('statements/profit-loss/pdf')
  @RequirePermissions('finance.view_statements')
  async profitLossPdf(@Request() req: any, @Query() query: any, @Res({ passthrough: true }) res: Response): Promise<StreamableFile> {
    const buf = await this.pdfService.generateProfitLossPdf(req.user.clinicId, query.dateFrom, query.dateTo, query.branchId);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="Profit-And-Loss.pdf"', 'Content-Length': buf.length });
    return new StreamableFile(Readable.from(buf));
  }

  @Get('statements/cash-flow')
  @RequirePermissions('finance.view_statements')
  getCashFlow(@Request() req: any, @Query() query: any) {
    return this.statementsService.getCashFlow(req.user.clinicId, query);
  }

  // ── Financial Statement Template (Phase 8 integration) ──────────────────

  @Get('template')
  @RequirePermissions('finance.view_statements')
  getTemplate(@Request() req: any) {
    return this.pdfService.getTemplate(req.user.clinicId);
  }

  @Patch('template')
  @RequirePermissions('finance.manage_accounts')
  saveTemplate(@Request() req: any, @Body() body: Record<string, any>) {
    return this.pdfService.saveTemplate(req.user.clinicId, body);
  }

  // ── Period Close ──────────────────────────────────────────────────────────

  @Get('periods')
  @RequirePermissions('finance.view_ledger')
  listPeriods(@Request() req: any) {
    return this.periodService.list(req.user.clinicId);
  }

  @Post('periods/close')
  @RequirePermissions('finance.close_period')
  closePeriod(@Request() req: any, @Body() dto: ClosePeriodDto) {
    return this.periodService.closePeriod(req.user.clinicId, dto, req.user.id);
  }

  @Delete('periods/:id')
  @RequirePermissions('finance.close_period')
  reopenPeriod(@Request() req: any, @Param('id') id: string) {
    return this.periodService.reopenPeriod(req.user.clinicId, id, req.user.id);
  }
}