import {
  Injectable, NotFoundException, ConflictException, Logger,
  UnauthorizedException, ForbiddenException, ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import * as crypto from 'crypto';
import * as https from 'https';
import axios from 'axios';
import { JwantraIntegration, JwantraIntegrationStatus } from './entities/jwantra-integration.entity';
import {
  ConnectJwantraDto, UpdateJwantraWebhookDto, LinkJwantraApiKeyDto, AskJwantraDto,
} from './dto/jwantra-integration.dto';
import { Patient } from '../../patients/entities/patient.entity';
import { ClinicService } from '../../services/entities/service.entity';
import { Invoice, InvoiceStatus } from '../../billing/entities/invoice.entity';
import { Appointment } from '../../appointments/entities/appointment.entity';
import { Product } from '../../inventory/entities/product.entity';
import { User, isDoctorRole } from '../../users/entities/user.entity';
import { TreatmentPlanItem } from '../../treatment-plans/entities/treatment-plan-item.entity';
import { InventoryConsumptionEvent } from '../../inventory/entities/inventory-consumption.entity';
import { Branch } from '../../branch/entities/branch.entity';
import { DoctorClinicAffiliation, AffiliationStatus } from '../../doctor-affiliation/entities/doctor-clinic-affiliation.entity';
import { encryptSecret, decryptSecret } from './utils/secret-crypto.util';
import {
  mapAppointmentToJwantra,
  mapBranchToJwantra,
  mapDoctorToJwantra,
  mapInventoryConsumptionToJwantra,
  mapInventoryItemToJwantra,
  mapInvoiceToJwantra,
  mapPatientToJwantra,
  mapServiceToJwantra,
  mapTreatmentPlanToJwantra,
} from './mappers/jwantra.mappers';

const TOKEN_PREFIX = 'jwtr_live_';
const PAGE_SIZE_DEFAULT = 100;
const PAGE_SIZE_MAX = 250;
const WEBHOOK_TIMEOUT_MS = 8000;
const ASK_TIMEOUT_MS = 30000;
// Jwantra's own API origin — NOT this table's webhookUrl (that's Jwantra's
// inbound receiver for *this specific clinic*; this is the fixed base URL
// of Jwantra's API itself, same for every clinic). Overridable for
// self-hosted/staging Jwantra deployments.
const DEFAULT_JWANTRA_API_URL = 'https://api.jwantra.com';
// If api.jwantra.com's DNS is down but you know the origin's IP, set
// JWANTRA_API_URL to that IP (e.g. https://203.0.113.10:443 or
// http://203.0.113.10:8080) and this stays connected. When the override is
// https + a bare IP, we still send SNI/Host for "api.jwantra.com" (or
// JWANTRA_TLS_SERVERNAME if the origin uses a different cert name) so the
// upstream TLS cert — issued for the domain, not the IP — still validates.
// Without this, hitting an IP directly over https just throws
// ERR_TLS_CERT_ALTNAME_INVALID.
const JWANTRA_CERT_SERVERNAME = process.env.JWANTRA_TLS_SERVERNAME || 'api.jwantra.com';

function isBareIpUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) || hostname.includes(':'); // IPv4 or IPv6
  } catch {
    return false;
  }
}

/** Extra axios config needed when JWANTRA_API_URL points at a bare IP over
 * https: keeps TLS validation working by pinning SNI + the Host header to
 * the real cert name instead of disabling certificate checks. */
function jwantraTlsOverrides(baseUrl: string): { headers?: Record<string, string>; httpsAgent?: https.Agent } {
  if (!baseUrl.startsWith('https://') || !isBareIpUrl(baseUrl)) return {};
  return {
    headers: { Host: JWANTRA_CERT_SERVERNAME },
    httpsAgent: new https.Agent({ servername: JWANTRA_CERT_SERVERNAME }),
  };
}

export interface Page<T> {
  data: T[];
  hasMore: boolean;
}

@Injectable()
export class JwantraIntegrationService {
  private readonly logger = new Logger(JwantraIntegrationService.name);

  constructor(
    @InjectRepository(JwantraIntegration) private repo: Repository<JwantraIntegration>,
    @InjectRepository(Patient) private patientRepo: Repository<Patient>,
    @InjectRepository(ClinicService) private serviceRepo: Repository<ClinicService>,
    @InjectRepository(Invoice) private invoiceRepo: Repository<Invoice>,
    @InjectRepository(Appointment) private appointmentRepo: Repository<Appointment>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(TreatmentPlanItem) private treatmentPlanRepo: Repository<TreatmentPlanItem>,
    @InjectRepository(InventoryConsumptionEvent) private consumptionRepo: Repository<InventoryConsumptionEvent>,
    @InjectRepository(Branch) private branchRepo: Repository<Branch>,
    @InjectRepository(DoctorClinicAffiliation) private affiliationRepo: Repository<DoctorClinicAffiliation>,
  ) {}

  // ── Connection lifecycle (JWT-authenticated, clinic-owner facing) ──────

  async connect(clinicId: string, dto: ConnectJwantraDto) {
    const existing = await this.repo.findOne({ where: { clinicId } });
    if (existing && existing.status === JwantraIntegrationStatus.ACTIVE) {
      throw new ConflictException(
        'Jwantra is already connected for this clinic. Disconnect first to issue a new token.',
      );
    }

    const rawToken = `${TOKEN_PREFIX}${crypto.randomBytes(32).toString('hex')}`;
    const tokenHash = this.hash(rawToken);
    const tokenPrefix = rawToken.slice(0, 8);

    let rawWebhookSecret: string | undefined;
    let encryptedWebhookSecret: string | undefined;
    if (dto.webhookUrl) {
      rawWebhookSecret = crypto.randomBytes(24).toString('hex');
      encryptedWebhookSecret = encryptSecret(rawWebhookSecret);
    }

    const record = existing ?? this.repo.create({ clinicId });
    Object.assign(record, {
      tokenHash,
      tokenPrefix,
      status: JwantraIntegrationStatus.ACTIVE,
      webhookUrl: dto.webhookUrl ?? null,
      encryptedWebhookSecret: encryptedWebhookSecret ?? null,
      requestCount: 0,
      lastUsedAt: null,
      lastWebhookError: null,
    });
    await this.repo.save(record);

    return {
      token: rawToken, // returned ONCE — not recoverable after this response
      webhookSecret: rawWebhookSecret ?? null,
      webhookUrl: record.webhookUrl,
      tokenPrefix,
      connectedAt: record.updatedAt,
    };
  }

  async getStatus(clinicId: string) {
    const record = await this.repo.findOne({ where: { clinicId } });
    if (!record) {
      return { connected: false as const };
    }
    return {
      connected: record.status === JwantraIntegrationStatus.ACTIVE,
      tokenPrefix: record.tokenPrefix,
      webhookUrl: record.webhookUrl,
      webhookConfigured: !!record.encryptedWebhookSecret,
      lastUsedAt: record.lastUsedAt,
      requestCount: record.requestCount,
      lastWebhookDispatchAt: record.lastWebhookDispatchAt,
      lastWebhookError: record.lastWebhookError,
      connectedAt: record.createdAt,
      // AI analysis link (the reverse direction — see saveApiKey/ask
      // below). Independent of `connected` above: a clinic can share
      // data with Jwantra without linking AI, though the "Jwantra AI"
      // page in ClinicKarobar's UI expects both before it shows analysis.
      aiLinked: !!record.encryptedJwantraApiKey,
      aiKeyPrefix: record.jwantraApiKeyPrefix ?? null,
      aiLinkedAt: record.jwantraApiKeyLinkedAt ?? null,
    };
  }

  async disconnect(clinicId: string) {
    const record = await this.repo.findOne({ where: { clinicId } });
    if (!record) throw new NotFoundException('Jwantra is not connected for this clinic');
    record.status = JwantraIntegrationStatus.REVOKED;
    await this.repo.save(record);
    return { connected: false };
  }

  /** Set/replace the webhook URL, rotating the signing secret. Pass no URL to clear it. */
  async updateWebhook(clinicId: string, dto: UpdateJwantraWebhookDto) {
    const record = await this.repo.findOne({ where: { clinicId, status: JwantraIntegrationStatus.ACTIVE } });
    if (!record) throw new NotFoundException('Jwantra is not connected for this clinic');

    if (!dto.webhookUrl) {
      record.webhookUrl = null;
      record.encryptedWebhookSecret = null;
      await this.repo.save(record);
      return { webhookUrl: null, webhookSecret: null };
    }

    const rawWebhookSecret = crypto.randomBytes(24).toString('hex');
    record.webhookUrl = dto.webhookUrl;
    record.encryptedWebhookSecret = encryptSecret(rawWebhookSecret);
    record.lastWebhookError = null;
    await this.repo.save(record);
    return { webhookUrl: record.webhookUrl, webhookSecret: rawWebhookSecret };
  }

  // ── AI link (JWT-authenticated, clinic-owner facing) ────────────────────
  // The reverse direction from connect()/disconnect() above: those let
  // Jwantra pull data FROM ClinicKarobar; this lets ClinicKarobar call OUT
  // to Jwantra's AI so a clinic can see analysis of that same synced data
  // without leaving ClinicKarobar (see JwantraDataController comment on
  // the other side, and app/apikeys/router.py::external_ask on Jwantra's).

  async saveApiKey(clinicId: string, dto: LinkJwantraApiKeyDto) {
    const record = await this.repo.findOne({ where: { clinicId } });
    if (!record) {
      throw new NotFoundException(
        'Connect Jwantra first (Step 1) before linking an API key — this generates the integration token Jwantra needs.',
      );
    }
    record.encryptedJwantraApiKey = encryptSecret(dto.apiKey);
    record.jwantraApiKeyPrefix = dto.apiKey.slice(0, 12);
    record.jwantraApiKeyLinkedAt = new Date();
    await this.repo.save(record);
    return {
      aiLinked: true,
      aiKeyPrefix: record.jwantraApiKeyPrefix,
      aiLinkedAt: record.jwantraApiKeyLinkedAt,
    };
  }

  async clearApiKey(clinicId: string) {
    const record = await this.repo.findOne({ where: { clinicId } });
    if (!record?.encryptedJwantraApiKey) {
      throw new NotFoundException('No Jwantra API key is linked for this clinic');
    }
    record.encryptedJwantraApiKey = null;
    record.jwantraApiKeyPrefix = null;
    record.jwantraApiKeyLinkedAt = null;
    await this.repo.save(record);
    return { aiLinked: false };
  }

  /**
   * Proxies a natural-language query to Jwantra's external AI endpoint
   * using this clinic's linked API key, so the browser never sees (or
   * needs to store) the raw key — same trust boundary as every other
   * secret on this entity. Mirrors exactly what a logged-in Jwantra user
   * would get asking the same question in Jwantra's own command bar
   * (see app/apikeys/router.py::external_ask on Jwantra's side).
   */
  async ask(clinicId: string, dto: AskJwantraDto): Promise<Record<string, any>> {
    const record = await this.repo.findOne({ where: { clinicId } });
    if (!record?.encryptedJwantraApiKey) {
      throw new NotFoundException(
        "Jwantra AI isn't linked for this clinic yet — add your Jwantra API key first.",
      );
    }
    const apiKey = decryptSecret(record.encryptedJwantraApiKey);
    const baseUrl = (process.env.JWANTRA_API_URL || DEFAULT_JWANTRA_API_URL).replace(/\/+$/, '');
    const tlsOverrides = jwantraTlsOverrides(baseUrl);

    try {
      const resp = await axios.post(
        `${baseUrl}/api/v1/external/ask`,
        { query: dto.query },
        {
          headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json', ...tlsOverrides.headers },
          httpsAgent: tlsOverrides.httpsAgent,
          timeout: ASK_TIMEOUT_MS,
        },
      );
      return resp.data;
    } catch (err: any) {
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail;
      if (status === 401) {
        throw new UnauthorizedException(
          'Your Jwantra API key is invalid or was revoked. Re-link it from this page, or generate a new one in Jwantra > Settings > API Keys.',
        );
      }
      if (status === 402) {
        throw new ForbiddenException(
          "This clinic's Jwantra plan doesn't include API access. Upgrade to Jwantra Pro to use AI analysis here.",
        );
      }
      if (status === 403) {
        throw new ForbiddenException(
          typeof detail === 'string'
            ? detail
            : "This Jwantra API key is missing the permission needed to ask questions. Reissue it with the 'orchestration:ask' scope.",
        );
      }
      this.logger.warn(`Jwantra /external/ask failed for clinic ${clinicId}: ${err?.message ?? err}`);
      throw new ServiceUnavailableException('Could not reach Jwantra AI right now. Please try again shortly.');
    }
  }

  // ── Guard support ───────────────────────────────────────────────────────

  async validate(rawToken: string): Promise<{ clinicId: string } | null> {
    const hash = this.hash(rawToken);
    const record = await this.repo.findOne({ where: { tokenHash: hash } });
    if (!record || record.status !== JwantraIntegrationStatus.ACTIVE) return null;

    this.repo.update(record.id, {
      lastUsedAt: new Date(),
      requestCount: record.requestCount + 1,
    }).catch((err) => this.logger.warn(`Failed to bump usage stats: ${err?.message ?? err}`));

    return { clinicId: record.clinicId };
  }

  // ── Read endpoints (polled by Jwantra) ──────────────────────────────────

  /** Synced first, ahead of every branch-scoped list below — see
   * mapBranchToJwantra's docstring for why. */
  async listBranches(clinicId: string, opts: { limit?: number; offset?: number; updatedAfter?: Date }): Promise<Page<any>> {
    const { limit, offset } = this.clampPaging(opts);
    const where: any = { clinicId };
    if (opts.updatedAfter) where.updatedAt = MoreThan(opts.updatedAfter);

    const rows = await this.branchRepo.find({
      where,
      order: { updatedAt: 'ASC', id: 'ASC' },
      take: limit,
      skip: offset,
    });
    return { data: rows.map(mapBranchToJwantra), hasMore: rows.length === limit };
  }

  async listPatients(clinicId: string, opts: { limit?: number; offset?: number; updatedAfter?: Date }): Promise<Page<any>> {
    const { limit, offset } = this.clampPaging(opts);
    const where: any = { clinicId };
    if (opts.updatedAfter) where.updatedAt = MoreThan(opts.updatedAfter);

    const rows = await this.patientRepo.find({
      where,
      order: { updatedAt: 'ASC', id: 'ASC' },
      take: limit,
      skip: offset,
    });
    return { data: rows.map(mapPatientToJwantra), hasMore: rows.length === limit };
  }

  async listServices(clinicId: string, opts: { limit?: number; offset?: number; updatedAfter?: Date }): Promise<Page<any>> {
    const { limit, offset } = this.clampPaging(opts);
    const where: any = { clinicId };
    if (opts.updatedAfter) where.updatedAt = MoreThan(opts.updatedAfter);

    const rows = await this.serviceRepo.find({
      where,
      order: { updatedAt: 'ASC', id: 'ASC' },
      take: limit,
      skip: offset,
    });
    return { data: rows.map(mapServiceToJwantra), hasMore: rows.length === limit };
  }

  async listInvoices(clinicId: string, opts: { limit?: number; offset?: number; updatedAfter?: Date }): Promise<Page<any>> {
    const { limit, offset } = this.clampPaging(opts);
    const where: any = { clinicId };
    if (opts.updatedAfter) where.updatedAt = MoreThan(opts.updatedAfter);

    const rows = await this.invoiceRepo.find({
      where,
      order: { updatedAt: 'ASC', id: 'ASC' },
      take: limit,
      skip: offset,
    });
    return { data: rows.map(mapInvoiceToJwantra), hasMore: rows.length === limit };
  }

  // ── Phase 7 (healthcare) read endpoints (polled by Jwantra) ────────────
  // Same shape/paging contract as listPatients/listServices/listInvoices
  // above — these feed jwantra's dedicated healthcare tables (appointments,
  // employees-as-doctors, clinic_inventory_items) instead of its generic
  // customers/products/orders schema. No entity on this side changes to
  // support them; each just exposes rows an existing repo already has.

  async listAppointments(clinicId: string, opts: { limit?: number; offset?: number; updatedAfter?: Date }): Promise<Page<any>> {
    const { limit, offset } = this.clampPaging(opts);
    const where: any = { clinicId };
    if (opts.updatedAfter) where.updatedAt = MoreThan(opts.updatedAfter);

    const rows = await this.appointmentRepo.find({
      where,
      order: { updatedAt: 'ASC', id: 'ASC' },
      take: limit,
      skip: offset,
    });
    return { data: rows.map(mapAppointmentToJwantra), hasMore: rows.length === limit };
  }

  async listDoctors(clinicId: string, opts: { limit?: number; offset?: number }): Promise<Page<any>> {
    const { limit, offset } = this.clampPaging(opts);
    // Best-effort: filters on User.clinicId (a doctor's primary/home
    // clinic), same simple clinic-scoping every other endpoint here uses.
    // A doctor affiliated with this clinic only via DoctorClinicAffiliation
    // (see doctor-affiliation module) and with no primary clinicId set
    // won't show up here yet — that join is a reasonable follow-up if
    // multi-clinic doctors turn out to be common, but it's out of scope
    // for closing today's "no healthcare data at all" gap.
    const rows = await this.userRepo.find({
      where: { clinicId },
      order: { createdAt: 'ASC' },
      take: limit,
      skip: offset,
    });
    const doctors = rows.filter((u) => isDoctorRole(u.role));

    // A doctor can be affiliated with multiple branches of this clinic
    // (DoctorClinicAffiliation is many-to-many), but jwantra's Employee
    // only has a single branch_id. Pick one "primary" branch per doctor:
    // prefer the affiliation flagged isPrimaryEmployment, else fall back
    // to the earliest active one. Every downstream jwantra pipeline that
    // branch-scopes (e.g. doctor_workload_forecasting) depends on this
    // being set — leaving it null silently drops doctors from any
    // per-branch view even though their appointments stay branch-tagged.
    const doctorIds = new Set(doctors.map((d) => d.id));
    const branchIdByDoctor = new Map<string, string>();
    const isPrimarySet = new Set<string>();
    if (doctorIds.size > 0) {
      const affiliations = await this.affiliationRepo.find({
        where: { clinicId, status: AffiliationStatus.ACTIVE },
        order: { joinedAt: 'ASC' },
      });
      for (const aff of affiliations) {
        if (!doctorIds.has(aff.doctorUserId) || !aff.branchId) continue;
        // Keep the first branch seen unless/until a primary-employment
        // affiliation comes along, which always wins.
        if (!branchIdByDoctor.has(aff.doctorUserId) || (aff.isPrimaryEmployment && !isPrimarySet.has(aff.doctorUserId))) {
          branchIdByDoctor.set(aff.doctorUserId, aff.branchId);
          if (aff.isPrimaryEmployment) isPrimarySet.add(aff.doctorUserId);
        }
      }
    }

    return {
      data: doctors.map((u) => mapDoctorToJwantra(u, branchIdByDoctor.get(u.id) ?? null)),
      hasMore: rows.length === limit,
    };
  }

  async listInventory(clinicId: string, opts: { limit?: number; offset?: number; updatedAfter?: Date }): Promise<Page<any>> {
    const { limit, offset } = this.clampPaging(opts);
    const where: any = { clinicId };
    if (opts.updatedAfter) where.updatedAt = MoreThan(opts.updatedAfter);

    const rows = await this.productRepo.find({
      where,
      order: { updatedAt: 'ASC', id: 'ASC' },
      take: limit,
      skip: offset,
    });
    return { data: rows.map(mapInventoryItemToJwantra), hasMore: rows.length === limit };
  }

  /** Structured treatment proposals (proposed/accepted/declined) — see
   * treatment-plans/entities/treatment-plan-item.entity.ts. Distinct from
   * listServices/mapServiceToJwantra (the price-list catalog); this is
   * one row per proposal made to a patient, not the treatment itself. */
  async listTreatmentPlans(clinicId: string, opts: { limit?: number; offset?: number; updatedAfter?: Date }): Promise<Page<any>> {
    const { limit, offset } = this.clampPaging(opts);
    const where: any = { clinicId };
    if (opts.updatedAfter) where.updatedAt = MoreThan(opts.updatedAfter);

    const rows = await this.treatmentPlanRepo.find({
      where,
      order: { updatedAt: 'ASC', id: 'ASC' },
      take: limit,
      skip: offset,
    });
    return { data: rows.map(mapTreatmentPlanToJwantra), hasMore: rows.length === limit };
  }

  /** Per-event stock-decrement log — see
   * inventory/entities/inventory-consumption.entity.ts. Immutable once
   * written (a consumption event is never edited), so paged by createdAt
   * rather than updatedAt like every other list* method here. */
  async listInventoryConsumption(clinicId: string, opts: { limit?: number; offset?: number; updatedAfter?: Date }): Promise<Page<any>> {
    const { limit, offset } = this.clampPaging(opts);
    const where: any = { clinicId };
    if (opts.updatedAfter) where.createdAt = MoreThan(opts.updatedAfter);

    const rows = await this.consumptionRepo.find({
      where,
      order: { createdAt: 'ASC', id: 'ASC' },
      take: limit,
      skip: offset,
    });
    return { data: rows.map(mapInventoryConsumptionToJwantra), hasMore: rows.length === limit };
  }

  private clampPaging(opts: { limit?: number; offset?: number }) {
    const limit = Math.min(Math.max(1, opts.limit ?? PAGE_SIZE_DEFAULT), PAGE_SIZE_MAX);
    const offset = Math.max(0, opts.offset ?? 0);
    return { limit, offset };
  }

  // ── Outbound webhooks (optional — invoice.paid / appointment.completed) ─
  // Called fire-and-forget from BillingService/PaymentsService/
  // AppointmentsService via @Optional() injection, so this module being
  // absent or a dispatch failing never breaks the caller's own request.

  async notifyInvoicePaid(clinicId: string, invoice: Invoice): Promise<void> {
    if (invoice.status !== InvoiceStatus.PAID && invoice.status !== InvoiceStatus.PARTIALLY_PAID) return;
    const topic = invoice.status === InvoiceStatus.PAID ? 'invoice.paid' : 'invoice.updated';
    await this.dispatch(clinicId, topic, mapInvoiceToJwantra(invoice));
  }

  async notifyAppointmentCompleted(clinicId: string, appointment: Appointment): Promise<void> {
    await this.dispatch(clinicId, 'appointment.completed', {
      id: appointment.id,
      patientId: (appointment as any).patientId ?? null,
      completedAt: (appointment as any).updatedAt ?? new Date().toISOString(),
    });
  }

  private async dispatch(clinicId: string, topic: string, data: Record<string, any>): Promise<void> {
    const record = await this.repo.findOne({ where: { clinicId, status: JwantraIntegrationStatus.ACTIVE } });
    if (!record?.webhookUrl || !record.encryptedWebhookSecret) return; // webhooks are opt-in

    const secret = decryptSecret(record.encryptedWebhookSecret);
    const body = JSON.stringify({ topic, data });
    const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');

    try {
      await axios.post(record.webhookUrl, body, {
        headers: {
          'Content-Type': 'application/json',
          'X-ClinicKarobar-Signature': signature,
          'X-ClinicKarobar-Topic': topic,
        },
        timeout: WEBHOOK_TIMEOUT_MS,
      });
      await this.repo.update(record.id, { lastWebhookDispatchAt: new Date(), lastWebhookError: null });
    } catch (err: any) {
      const message = err?.message ?? String(err);
      this.logger.warn(`Jwantra webhook dispatch failed for clinic ${clinicId} (${topic}): ${message}`);
      await this.repo.update(record.id, { lastWebhookDispatchAt: new Date(), lastWebhookError: message });
      // Deliberately not thrown further — Jwantra's own polling is the
      // durable path; a failed webhook is a missed optimization, not a
      // data-loss event, and must never fail the invoice/appointment
      // request that triggered it.
    }
  }

  private hash(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }
}
