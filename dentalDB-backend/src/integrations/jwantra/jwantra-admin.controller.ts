import { Body, Controller, Delete, Get, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwantraIntegrationService } from './jwantra-integration.service';
import {
  ConnectJwantraDto, UpdateJwantraWebhookDto, LinkJwantraApiKeyDto, AskJwantraDto,
} from './dto/jwantra-integration.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../auth/guards/roles.guard';
import { UserRole } from '../../users/entities/user.entity';

/**
 * Clinic-owner-facing management endpoints — mirrors the "generate a
 * scoped Jwantra integration token from ClinicKarobar's own settings" flow
 * described in app/connectors/clinickarobar.py on the Jwantra side. Not
 * Enterprise-gated (unlike /api-keys): this is a first-party integration
 * between sibling products, available on any plan.
 */
@ApiTags('Integrations - Jwantra')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('integrations/jwantra')
export class JwantraAdminController {
  constructor(private readonly service: JwantraIntegrationService) {}

  @ApiOperation({ summary: 'Connection status for this clinic' })
  @Get('status')
  status(@Request() req) {
    return this.service.getStatus(req.user.clinicId);
  }

  @ApiOperation({ summary: 'Issue a new integration token (returned once) and optionally a webhook secret' })
  @Post('connect')
  @Roles(UserRole.OWNER, UserRole.SUPER_ADMIN)
  connect(@Request() req, @Body() dto: ConnectJwantraDto) {
    return this.service.connect(req.user.clinicId, dto);
  }

  @ApiOperation({ summary: 'Set, replace, or clear the webhook URL (rotates the signing secret)' })
  @Patch('webhook')
  @Roles(UserRole.OWNER, UserRole.SUPER_ADMIN)
  updateWebhook(@Request() req, @Body() dto: UpdateJwantraWebhookDto) {
    return this.service.updateWebhook(req.user.clinicId, dto);
  }

  @ApiOperation({ summary: 'Revoke the integration token, disconnecting Jwantra' })
  @Delete('connect')
  @Roles(UserRole.OWNER, UserRole.SUPER_ADMIN)
  disconnect(@Request() req) {
    return this.service.disconnect(req.user.clinicId);
  }

  // ── AI link — lets this clinic see Jwantra's AI analysis inside
  // ClinicKarobar itself (Step 2 of the "Jwantra AI" settings page,
  // after Step 1's connect() above has issued an integration token). ──

  @ApiOperation({ summary: "Link this clinic's Jwantra API key so ClinicKarobar can fetch AI analysis on its behalf" })
  @Post('ai/link')
  @Roles(UserRole.OWNER, UserRole.SUPER_ADMIN)
  linkAi(@Request() req, @Body() dto: LinkJwantraApiKeyDto) {
    return this.service.saveApiKey(req.user.clinicId, dto);
  }

  @ApiOperation({ summary: 'Unlink the Jwantra API key (stops AI analysis from working here, data sync is unaffected)' })
  @Delete('ai/link')
  @Roles(UserRole.OWNER, UserRole.SUPER_ADMIN)
  unlinkAi(@Request() req) {
    return this.service.clearApiKey(req.user.clinicId);
  }

  @ApiOperation({ summary: "Ask Jwantra's AI a question about this clinic's synced data — no @Roles restriction, so any signed-in staff member who can see this page can query it, same as viewing any other analytics screen" })
  @Post('ai/ask')
  ask(@Request() req, @Body() dto: AskJwantraDto) {
    return this.service.ask(req.user.clinicId, dto);
  }
}
