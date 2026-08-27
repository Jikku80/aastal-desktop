import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity } from '@nestjs/swagger';
import { JwantraIntegrationService } from './jwantra-integration.service';
import { JwantraTokenGuard } from './guards/jwantra-token.guard';

/**
 * The namespace app/connectors/clinickarobar.py polls on the Jwantra side
 * (fetch_customers -> /patients, fetch_products -> /services,
 * fetch_orders -> /invoices, plus the Phase 7 healthcare additions:
 * fetch_appointments -> /appointments, fetch_doctors -> /doctors,
 * fetch_inventory_items -> /inventory). Response shape is
 * `{ data: [...], hasMore }` on every route to match `_PAGE_SIZE`/offset
 * pagination and the `body.get("hasMore", ...)` fallback the connector
 * already implements.
 *
 * Auth: bearer token issued by JwantraAdminController.connect(), validated
 * by JwantraTokenGuard — NOT the staff JwtAuthGuard used everywhere else in
 * this app, since these requests come from Jwantra's backend, not a logged
 * -in browser session.
 */
@ApiTags('Integrations - Jwantra (data)')
@ApiSecurity('bearer')
@UseGuards(JwantraTokenGuard)
@Controller('integrations/jwantra')
export class JwantraDataController {
  constructor(private readonly service: JwantraIntegrationService) {}

  @ApiOperation({ summary: "List the clinic's branches (id + name) — synced first so every other branch-scoped row (patients, appointments, etc.) resolves to a properly-named branch instead of a generic placeholder" })
  @Get('branches')
  branches(
    @Request() req: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('updatedAfter') updatedAfter?: string,
  ) {
    return this.service.listBranches(req.jwantraClinicId, {
      limit: parseIntOrUndefined(limit),
      offset: parseIntOrUndefined(offset),
      updatedAfter: parseDateOrUndefined(updatedAfter),
    });
  }

  @ApiOperation({ summary: 'List patients for the connected clinic (paginated)' })
  @Get('patients')
  patients(
    @Request() req: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('updatedAfter') updatedAfter?: string,
  ) {
    return this.service.listPatients(req.jwantraClinicId, {
      limit: parseIntOrUndefined(limit),
      offset: parseIntOrUndefined(offset),
      updatedAfter: parseDateOrUndefined(updatedAfter),
    });
  }

  @ApiOperation({ summary: 'List the clinic\'s service/treatment price list (paginated)' })
  @Get('services')
  services(
    @Request() req: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('updatedAfter') updatedAfter?: string,
  ) {
    return this.service.listServices(req.jwantraClinicId, {
      limit: parseIntOrUndefined(limit),
      offset: parseIntOrUndefined(offset),
      updatedAfter: parseDateOrUndefined(updatedAfter),
    });
  }

  @ApiOperation({ summary: 'List invoices for the connected clinic (paginated)' })
  @Get('invoices')
  invoices(
    @Request() req: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('updatedAfter') updatedAfter?: string,
  ) {
    return this.service.listInvoices(req.jwantraClinicId, {
      limit: parseIntOrUndefined(limit),
      offset: parseIntOrUndefined(offset),
      updatedAfter: parseDateOrUndefined(updatedAfter),
    });
  }

  // ── Phase 7 (healthcare) additions ────────────────────────────────────

  @ApiOperation({ summary: 'List appointments for the connected clinic (paginated)' })
  @Get('appointments')
  appointments(
    @Request() req: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('updatedAfter') updatedAfter?: string,
  ) {
    return this.service.listAppointments(req.jwantraClinicId, {
      limit: parseIntOrUndefined(limit),
      offset: parseIntOrUndefined(offset),
      updatedAfter: parseDateOrUndefined(updatedAfter),
    });
  }

  @ApiOperation({ summary: "List the clinic's doctors/dentists (paginated) — feeds Jwantra's doctor-workload and appointment-duration pipelines" })
  @Get('doctors')
  doctors(
    @Request() req: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.service.listDoctors(req.jwantraClinicId, {
      limit: parseIntOrUndefined(limit),
      offset: parseIntOrUndefined(offset),
    });
  }

  @ApiOperation({ summary: 'List clinic supply/consumable inventory items (paginated)' })
  @Get('inventory')
  inventory(
    @Request() req: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('updatedAfter') updatedAfter?: string,
  ) {
    return this.service.listInventory(req.jwantraClinicId, {
      limit: parseIntOrUndefined(limit),
      offset: parseIntOrUndefined(offset),
      updatedAfter: parseDateOrUndefined(updatedAfter),
    });
  }

  @ApiOperation({ summary: "List structured treatment proposals (proposed/accepted/declined) for the connected clinic (paginated)" })
  @Get('treatment-plans')
  treatmentPlans(
    @Request() req: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('updatedAfter') updatedAfter?: string,
  ) {
    return this.service.listTreatmentPlans(req.jwantraClinicId, {
      limit: parseIntOrUndefined(limit),
      offset: parseIntOrUndefined(offset),
      updatedAfter: parseDateOrUndefined(updatedAfter),
    });
  }

  @ApiOperation({ summary: 'List inventory stock-consumption events for the connected clinic (paginated) — feeds inventory consumption prediction' })
  @Get('inventory-consumption')
  inventoryConsumption(
    @Request() req: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('updatedAfter') updatedAfter?: string,
  ) {
    return this.service.listInventoryConsumption(req.jwantraClinicId, {
      limit: parseIntOrUndefined(limit),
      offset: parseIntOrUndefined(offset),
      updatedAfter: parseDateOrUndefined(updatedAfter),
    });
  }
}

function parseIntOrUndefined(value?: string): number | undefined {
  if (value === undefined || value === '') return undefined;
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : undefined;
}

function parseDateOrUndefined(value?: string): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}
