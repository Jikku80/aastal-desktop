import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';
import { IntakeFormsService } from './intake-forms.service';

@Controller('intake-forms')
export class IntakeFormsController {
  constructor(private readonly svc: IntakeFormsService) {}

  // ── Clinic-admin template management (web/admin app only) ─────────────────
  @Post('templates')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('intake.manage')
  create(@Body() body: any) { return this.svc.createTemplate(body); }

  @Patch('templates/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('intake.manage')
  update(@Param('id') id: string, @Body() body: any) { return this.svc.updateTemplate(id, body); }

  @Delete('templates/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('intake.manage')
  delete(@Param('id') id: string) { return this.svc.deleteTemplate(id); }

  // ── Read + patient-facing endpoints stay open — shared by the patient/user app ──
  @Get('templates') list(@Query() q: any) { return this.svc.getTemplates(q); }
  @Get('templates/:id') get(@Param('id') id: string) { return this.svc.getTemplate(id); }
  @Post('submit') submit(@Body() body: any) { return this.svc.submit(body); }
  @Get('submission/:appointmentId') getSubmission(@Param('appointmentId') id: string) { return this.svc.getSubmission(id); }
}