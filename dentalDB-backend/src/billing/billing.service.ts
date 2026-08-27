import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger, Optional } from '@nestjs/common';
import { ilike, withAdvisoryLock } from '../database/sql-helpers';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Invoice, InvoiceStatus, PaymentMethod } from './entities/invoice.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { CommissionsService } from '../commissions/commissions.service';
import { ClinicService } from '../services/entities/service.entity';
import { InventoryService } from '../inventory/inventory.service';
import { InventoryItemType } from '../inventory/entities/product.entity';
import { PharmacyService } from '../pharmacy/pharmacy.service';
import { User } from '../users/entities/user.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntityType } from '../audit/entities/audit-log.entity';
import { Clinic } from '../clinics/entities/clinic.entity';
import { LabWorkService } from '../lab-work/lab-work.service';
import { PatientWalletService } from '../patient-wallet/patient-wallet.service';
import { ClinicalRecordsService } from '../clinical-records/clinical-records.service';
import { nepalDayBoundsUTC, nepalTodayParts, nepalWallClockToUTC } from '../common/utils/timezone.util';
import { JwantraIntegrationService } from '../integrations/jwantra/jwantra-integration.service';
import { JournalService } from '../finance/journal.service';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  constructor(
    @InjectRepository(Invoice) private repo: Repository<Invoice>,
    @InjectRepository(Appointment) private aptRepo: Repository<Appointment>,
    @InjectRepository(ClinicService) private serviceRepo: Repository<ClinicService>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Clinic) private clinicRepo: Repository<Clinic>,
    @InjectDataSource() private dataSource: DataSource,
    private commissionsService: CommissionsService,
    private inventoryService: InventoryService,
    private pharmacyService: PharmacyService,
    private auditService: AuditService,
    private labWorkService: LabWorkService,
    private patientWalletService: PatientWalletService,
    private clinicalRecordsService: ClinicalRecordsService,
    // Optional: JwantraIntegrationModule is always loaded (see app.module),
    // but @Optional() keeps this service resilient if that ever changes —
    // a missing/failed webhook dispatch must never block billing.
    private journalService: JournalService,
    @Optional() private jwantraIntegration?: JwantraIntegrationService,
  ) {}

  /**
   * Fire-and-forget auto-journal hook, shared by create()/markPaid()/update()
   * (Phase 9 §2 — invoice paid → Debit Cash/AR, Credit Revenue). Never
   * allowed to block or fail the billing flow that's already succeeded by
   * the time this runs — postInvoicePayment() itself swallows its own
   * errors, but userId can legitimately be missing on system-driven update()
   * calls, so guard that here too.
   */
  private postInvoiceJournal(clinicId: string, invoice: Invoice, userId?: string): void {
    if (!userId) return;
    this.journalService.postInvoicePayment(clinicId, invoice, userId).catch(e =>
      this.logger.warn(`postInvoicePayment failed for invoice ${invoice.id}: ${e?.message}`));
  }

  /** Fire-and-forget — never let a webhook dispatch failure affect the billing request that triggered it. */
  private notifyJwantraInvoicePaid(clinicId: string, invoice: Invoice): void {
    if (!this.jwantraIntegration) return;
    this.jwantraIntegration.notifyInvoicePaid(clinicId, invoice).catch((e) =>
      this.logger.warn('Jwantra invoice.paid webhook dispatch failed: ' + e?.message));
  }

  /**
   * NOTE: invoice-number generation used to live in its own helper here, but
   * that meant the advisory lock released (transaction commit) before the
   * actual insert happened — leaving a race window where two concurrent
   * requests could compute the same number and collide on insert. It's now
   * inlined directly into create()'s transaction so the lock covers both the
   * count-read and the insert. See create() below.
   */

  /**
   * Shared commission trigger used by create(), markPaid(), and update().
   * Looks up each service-line item's assigned doctor, reads their personal
   * commissionRate from the User record, and writes a DoctorCommission row.
   * Always overrides any commissionPercentage on the item so each doctor earns
   * their individually configured rate rather than a per-service default.
   */
  private async triggerCommission(invoice: Invoice): Promise<void> {
    try {
      // If this invoice is linked to an appointment, load the appointment once
      // so we can fall back to its serviceId/dentistId when items are missing them.
      let aptFallback: { serviceId?: string; dentistId?: string } | null = null;
      if (invoice.appointmentId) {
        const apt = await this.aptRepo.findOne({ where: { id: invoice.appointmentId } });
        if (apt) aptFallback = { serviceId: apt.serviceId, dentistId: apt.dentistId };
      }

      const enrichedItems = await Promise.all(
        (invoice.items || []).map(async (item) => {
          // NEVER apply commission to product items — skip immediately
          if (item.productId) return item;

          // Resolve serviceId and doctorId — fall back to appointment values if missing on item
          const resolvedServiceId = item.serviceId || aptFallback?.serviceId;
          const resolvedDoctorId  = item.doctorId  || aptFallback?.dentistId;

          if (!resolvedServiceId || !resolvedDoctorId) return item;

          const doctor = await this.userRepo.findOne({ where: { id: resolvedDoctorId } });
          if (!doctor) return item;
          const rate = doctor.commissionRate != null ? Number(doctor.commissionRate) : 0;
          return { ...item, serviceId: resolvedServiceId, doctorId: resolvedDoctorId, commissionPercentage: rate };
        }),
      );
      await this.commissionsService.createForInvoice(invoice.clinicId, invoice.id, enrichedItems);
    } catch (e) {
      this.logger.warn('Commission trigger failed: ' + (e as any)?.message);
    }
  }

  /**
   * Auto-syncs the patient's clinical record right after an invoice is
   * created — server-side, so it happens for EVERY invoice-creation path
   * (the app, any future API client, imports, etc.) instead of depending on
   * a second, separate call from the frontend that could get skipped if the
   * tab closes or the network hiccups right after the invoice request lands.
   *
   * - Uses invoice.patientId (a UUID), never the patient's name.
   * - Products/lab-blood-test-only invoices (no serviceId on any item) never
   *   touch clinical records — ClinicalRecordsService.upsertFromBilling also
   *   enforces this itself, so this is just an early-exit, not the only guard.
   * - No existing record for this patient → creates one.
   * - A record already exists → appends a new dated visit entry (new
   *   timestamp, the services just billed, the resolved doctor) rather than
   *   overwriting anything.
   * - Idempotent per invoiceId (enforced in ClinicalRecordsService), so a
   *   retried/duplicate call for the same invoice never double-appends.
   * - Never throws: a clinical-record sync failure must never fail or roll
   *   back an otherwise-successful invoice creation.
   */
  private async syncClinicalRecord(invoice: Invoice): Promise<void> {
    try {
      const serviceItems = (invoice.items || []).filter((i: any) => i.serviceId);
      if (serviceItems.length === 0) return;

      const services = serviceItems
        .map((i: any) => (i.description || '').trim())
        .filter(Boolean);
      if (services.length === 0) return;

      const doctorId = serviceItems.find((i: any) => i.doctorId)?.doctorId || undefined;

      await this.clinicalRecordsService.upsertFromBilling(invoice.clinicId, {
        patientId:     invoice.patientId,
        branchId:      invoice.branchId || undefined,
        doctorId,
        appointmentId: invoice.appointmentId || undefined,
        invoiceId:     invoice.id,
        services,
        visitDate:     (invoice.createdAt ?? new Date()).toISOString(),
      });
    } catch (e) {
      this.logger.warn('Clinical record sync failed for invoice ' + invoice.id + ': ' + (e as any)?.message);
    }
  }

  // ── Pharmacy-aware stock check / deduction (Phase 3, section 13) ───────
  // Shared by create(), markPaid() (stock-check + deduct call sites) so a
  // pharmaceutical line item is checked/deducted the same way regardless
  // of which flow billed it. Non-pharmaceutical items keep using
  // InventoryService.adjustStock exactly as before — this only changes
  // behavior for products classified itemType === 'pharmaceutical'.

  /** Throws BadRequestException if the requested quantity isn't available. Pharma items are checked against usable (FEFO-eligible) stock, not raw stockQuantity. */
  private async checkStockForItem(clinicId: string, item: any, branchId?: string): Promise<void> {
    if (!item.productId || !(item.quantity > 0)) return;
    let product;
    try {
      product = await this.inventoryService.findOne(clinicId, item.productId);
    } catch (e) {
      if (e instanceof BadRequestException || e instanceof NotFoundException) throw e;
      this.logger.error('Stock check failed for product ' + item.productId + ': ' + (e as any)?.message, (e as any)?.stack);
      throw new BadRequestException('Could not verify stock for one of the products on this invoice. Please try again.');
    }

    if (product.itemType === InventoryItemType.PHARMACEUTICAL) {
      const usable = await this.pharmacyService.getUsableStock(clinicId, item.productId, branchId);
      if (usable < item.quantity) {
        throw new BadRequestException(
          'Insufficient usable stock for "' + product.name + '" (expired/unavailable batches excluded). Usable: ' + usable + ', Requested: ' + item.quantity
        );
      }
    } else if (product.stockQuantity < item.quantity) {
      throw new BadRequestException(
        'Insufficient stock for "' + product.name + '". Available: ' + product.stockQuantity + ', Requested: ' + item.quantity
      );
    }
  }

  /**
   * Deducts stock for one billed item. Pharmaceutical items route through
   * PharmacyService.dispense() — FEFO-allocated across batches — which
   * itself calls InventoryService.adjustStock(), so Product.stockQuantity
   * and the consumption log stay the single source of truth either way.
   * If the item carries a prescriptionId, the linked Prescription's
   * dispensed-quantity bookkeeping is updated too (best-effort).
   */
  private async deductStockForItem(clinicId: string, item: any, invoice: Invoice, userId?: string): Promise<void> {
    if (!item.productId || !(item.quantity > 0)) return;
    try {
      const product = await this.inventoryService.findOne(clinicId, item.productId);

      if (product.itemType === InventoryItemType.PHARMACEUTICAL) {
        await this.pharmacyService.dispense(clinicId, {
          productId: item.productId,
          quantity: item.quantity,
          branchId: invoice.branchId,
          reason: 'billing',
          appointmentId: invoice.appointmentId,
          invoiceId: invoice.id,
          patientId: invoice.patientId,
        }, userId);

        if (item.prescriptionId) {
          try {
            await this.clinicalRecordsService.markPrescriptionDispensed(clinicId, item.prescriptionId, item.quantity);
          } catch (e) {
            this.logger.warn('Failed to mark prescription ' + item.prescriptionId + ' dispensed: ' + (e as any)?.message);
          }
        }
      } else {
        await this.inventoryService.adjustStock(clinicId, item.productId, -item.quantity, {
          branchId: invoice.branchId,
          reason: 'billing',
          appointmentId: invoice.appointmentId,
          invoiceId: invoice.id,
          patientId: invoice.patientId,
        });
      }
    } catch (e) {
      this.logger.warn('Stock deduction failed for product ' + item.productId + ': ' + (e as any)?.message);
    }
  }

  async create(clinicId: string, dto: any, userId?: string): Promise<Invoice> {
    // Patient is optional at the DTO level (pharmacy/product-only walk-in
    // sales don't need one), but any service or lab/blood-test line item is
    // inherently tied to a specific patient (clinical record sync, doctor
    // commission attribution, lab-order linkage) — enforce that here rather
    // than trusting the frontend alone, since any other API client could
    // otherwise create a patient-less service invoice.
    if (!dto.patientId) {
      const items: any[] = dto.items || [];
      const needsPatient = items.some((i: any) => i.serviceId || i.labWorkId || i.bloodTestId);
      if (needsPatient) {
        throw new BadRequestException('A patient is required to bill a service or lab item — only product/pharmacy-only invoices can be created as a walk-in sale.');
      }
    }

    // create() persists whatever paymentMethod/paidAmount/status the client
    // sends — it has no wiring into PatientWalletService at all (unlike
    // markPaid() and PatientWalletService.applyToInvoice(), which actually
    // call .debit()). The legitimate frontend flow DOES send
    // paymentMethod: 'wallet_debit' here as a label — the invoice is created
    // first (status not yet 'paid', since the wallet portion isn't applied
    // yet), and a separate call to applyToInvoice() debits the wallet and
    // then flips the invoice to Paid. So paymentMethod alone isn't the
    // problem. What must never happen is a client creating an invoice that's
    // ALREADY marked fully Paid with paymentMethod 'wallet_debit' — that
    // combination can only be produced honestly by applyToInvoice/markPaid
    // (which debit first, then update), never by create() itself. Blocking
    // just that combination stops the exploit while leaving the normal
    // create-then-apply flow untouched.
    if (dto.paymentMethod === PaymentMethod.WALLET_DEBIT) {
      const total       = Number(dto.total ?? 0);
      const paidAmount  = Number(dto.paidAmount ?? 0);
      const claimsFullyPaidNow =
        dto.status === InvoiceStatus.PAID || (total > 0 && paidAmount >= total);
      if (claimsFullyPaidNow) {
        throw new BadRequestException(
          'An invoice cannot be created already marked Paid with paymentMethod "wallet_debit" — the wallet has not actually been debited yet. Create the invoice first (status not_yet_paid/partially_paid), then settle it via the wallet apply-to-invoice endpoint.',
        );
      }
    }

    const items: any[] = dto.items || [];
    for (const item of items) {
      await this.checkStockForItem(clinicId, item, dto.branchId);
    }

    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        const saved = await this.dataSource.transaction(async (manager) => {
          // The advisory lock must be held for the ENTIRE read-count + insert
          // sequence, not just the read. pg_advisory_xact_lock releases when
          // this transaction commits, so as long as the insert happens inside
          // here too, a second concurrent request blocks until this one is
          // fully committed and sees an up-to-date count — no more races.
          const lockKey = Buffer.from(clinicId).reduce((a, b) => a + b, 0) % 2147483647;
          await withAdvisoryLock(manager, lockKey);

          const year = new Date().getFullYear();
          const prefix = `INV-${year}-`;

          // IMPORTANT: this must be based on the highest invoice number actually
          // in use, not row count. Count breaks permanently the first time any
          // invoice is ever deleted — the count drops but existing invoices keep
          // their higher numbers, so count()+1 recomputes a number that's
          // already taken, and every retry recomputes the exact same collision
          // since a failed insert never changes the count.
          const last = await manager
            .createQueryBuilder(Invoice, 'i')
            .select('i.invoiceNumber', 'invoiceNumber')
            .where('i.clinicId = :clinicId', { clinicId })
            .andWhere('i.invoiceNumber LIKE :prefix', { prefix: prefix + '%' })
            .orderBy('i.invoiceNumber', 'DESC')
            .limit(1)
            .getRawOne();

          let nextSeq = 1;
          if (last?.invoiceNumber) {
            const tail   = String(last.invoiceNumber).slice(prefix.length);
            const parsed = parseInt(tail, 10);
            if (!Number.isNaN(parsed)) nextSeq = parsed + 1;
          }
          const invoiceNumber = prefix + String(nextSeq).padStart(5, '0');
          const invoiceUuid   = uuidv4();

          const resolvedStatus: InvoiceStatus = dto.status
            ? (dto.status as InvoiceStatus)
            : InvoiceStatus.DRAFT;

          const isPaidOnCreate    = resolvedStatus === InvoiceStatus.PAID;
          const isPartialOnCreate = resolvedStatus === InvoiceStatus.PARTIALLY_PAID;
          const total             = Number(dto.total ?? 0);

          // Partial payments: trust the amount actually collected up front
          // (e.g. patient pays NPR 200 of a 1000 bill, 800 stays due), clamped
          // to a sane [0, total] range. Fully-paid invoices always mean paidAmount === total.
          const partialPaidAmount = isPartialOnCreate
            ? Math.min(Math.max(Number(dto.paidAmount ?? 0), 0), total)
            : 0;

          // Auto-populate vatNumber from clinic when vatPercent > 0
          let vatNumber = dto.vatNumber;
          if (!vatNumber && Number(dto.vatPercent ?? 0) > 0) {
            const clinic = await manager.findOne(Clinic, { where: { id: clinicId } });
            vatNumber = clinic?.vatNumber ?? undefined;
          }

          const invoice = manager.create(Invoice, {
            ...dto,
            clinicId,
            invoiceNumber,
            invoiceUuid,
            vatNumber,
            status:     resolvedStatus,
            paidAmount: isPaidOnCreate ? total : partialPaidAmount,
            dueAmount:  isPaidOnCreate ? 0     : Math.max(total - partialPaidAmount, 0),
            paidAt:     isPaidOnCreate || partialPaidAmount > 0 ? new Date() : null,
          } as Partial<Invoice>);

          return manager.save(Invoice, invoice);
        });

        const bloodTestIds = items.filter(i => i.bloodTestId).map(i => i.bloodTestId);
        const labWorkIds   = [...bloodTestIds, ...items.filter(i => i.labWorkId).map(i => i.labWorkId)];
        // `bloodTestId` is kept on InvoiceItem only for backward compatibility with
        // invoices created before the Phase 5 blood-test/lab-work consolidation —
        // those ids now live in the same `lab_works` table, so both id sets are
        // marked billed through the single LabWorkService call.
        if (labWorkIds.length) {
          await this.labWorkService.markBilled(clinicId, labWorkIds, saved.id).catch(e =>
            this.logger.warn('Failed to mark lab work billed: ' + e?.message));
        }

        // Fires for every invoice regardless of paid/unpaid status — a
        // billed service is a real visit whether or not it's been paid for
        // yet. Products/tests-only invoices are a no-op (see method doc).
        await this.syncClinicalRecord(saved);

        if (saved.status === InvoiceStatus.PAID && saved.appointmentId) {
          await this.aptRepo.update({ id: saved.appointmentId }, { isPaid: true });
        }

        if (saved.status === InvoiceStatus.PAID) {
          for (const item of (saved.items || [])) {
            await this.deductStockForItem(clinicId, item, saved);
          }
          await this.triggerCommission(saved);
        }

        if (saved.status === InvoiceStatus.PAID || saved.status === InvoiceStatus.PARTIALLY_PAID) {
          this.notifyJwantraInvoicePaid(clinicId, saved);
          this.postInvoiceJournal(clinicId, saved, userId);
        }

        return saved;
      } catch (err: any) {
        if (err instanceof BadRequestException || err instanceof NotFoundException || err instanceof ConflictException) {
          throw err;
        }
        const isUniqueViolation =
          err?.code === '23505' &&
          (err?.detail?.includes('invoiceNumber') || err?.detail?.includes('invoiceUuid'));
        if (isUniqueViolation && attempt < 5) {
          await new Promise(r => setTimeout(r, attempt * 50));
          continue;
        }
        if (err?.code === '23503') { // foreign key violation
          throw new BadRequestException('Invoice references a patient, appointment, or branch that no longer exists.');
        }
        if (err?.code === '23502') { // not-null violation
          throw new BadRequestException('Invoice is missing a required field: ' + (err?.column || 'unknown'));
        }
        this.logger.error('Unexpected error creating invoice: ' + (err?.message || err), err?.stack);
        throw new BadRequestException('Could not create the invoice. Please check the details and try again.');
      }
    }
    throw new ConflictException('Failed to generate unique invoice number after 5 attempts');
  }

  async findAll(clinicId: string, query: any) {
    const { page = 1, limit = 20, search, status, branchId, dateFrom, dateTo } = query;

    let qb = this.repo
      .createQueryBuilder('i')
      .leftJoinAndSelect('i.patient', 'patient')
      .leftJoinAndSelect('i.branch', 'branch')
      .where('i.clinicId = :clinicId', { clinicId });

    if (status)   qb = qb.andWhere('i.status = :status', { status });
    if (branchId) qb = qb.andWhere('i.branchId = :branchId', { branchId });
    if (search) {
      qb = qb.andWhere(
        `(i.invoiceNumber ${ilike()} :s OR patient.firstName ${ilike()} :s OR patient.lastName ${ilike()} :s OR patient.opdNo ${ilike()} :s)`,
        { s: '%' + search + '%' },
      );
    }
    if (dateFrom) qb = qb.andWhere('i.createdAt >= :dateFrom', { dateFrom: new Date(dateFrom) });
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      qb = qb.andWhere('i.createdAt <= :dateTo', { dateTo: end });
    }

    qb = qb.orderBy('i.createdAt', 'DESC');
    const total = await qb.getCount();
    const data  = await qb.skip((page - 1) * limit).take(+limit).getMany();
    return { data, total, page: +page, limit: +limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(clinicId: string, id: string): Promise<Invoice> {
    const inv = await this.repo.findOne({
      where: { id, clinicId },
      relations: ['patient', 'appointment', 'branch'],
    });
    if (!inv) throw new NotFoundException('Invoice not found');
    return inv;
  }

  async update(clinicId: string, id: string, dto: any, userId?: string): Promise<Invoice> {
    await this.findOne(clinicId, id);
    await this.repo.update({ id, clinicId }, dto);
    const updated = await this.findOne(clinicId, id);

    if (Array.isArray(dto.items)) {
      const bloodTestIds = dto.items.filter((i: any) => i.bloodTestId).map((i: any) => i.bloodTestId);
      const labWorkIds   = [...bloodTestIds, ...dto.items.filter((i: any) => i.labWorkId).map((i: any) => i.labWorkId)];
      if (labWorkIds.length) {
        await this.labWorkService.markBilled(clinicId, labWorkIds, updated.id).catch(e =>
          this.logger.warn('Failed to mark lab work billed: ' + e?.message));
      }
    }

    // Trigger commission if status changed to paid via a plain update
    if (dto.status === InvoiceStatus.PAID || dto.status === InvoiceStatus.PARTIALLY_PAID) {
      await this.triggerCommission(updated);
      this.notifyJwantraInvoicePaid(clinicId, updated);
      this.postInvoiceJournal(clinicId, updated, userId);
    }
    return updated;
  }

  async markPaid(
    clinicId: string,
    id: string,
    dto: { paymentMethod: PaymentMethod; amount: number; transactionId?: string },
    userId: string,
  ): Promise<Invoice> {
    const inv = await this.findOne(clinicId, id);

    for (const item of (inv.items || [])) {
      await this.checkStockForItem(clinicId, item, inv.branchId);
    }

    const amount = Number(dto.amount);

    // Paying "from the patient wallet" needs to actually move money out of
    // it. This branch used to be entirely missing — markPaid() would record
    // the invoice as paid/partially paid for ANY paymentMethod including
    // 'wallet_debit' without ever calling into PatientWalletService, so the
    // UI showed a success toast while the patient's wallet balance never
    // moved. debit() throws BadRequestException('Insufficient wallet
    // balance') when the wallet can't cover it, which now correctly blocks
    // the invoice from being marked paid for money that was never collected.
    if (dto.paymentMethod === PaymentMethod.WALLET_DEBIT) {
      if (!inv.patientId) {
        throw new BadRequestException('This invoice has no patient attached, so it cannot be paid from a patient wallet.');
      }
      await this.patientWalletService.debit(
        clinicId,
        inv.patientId,
        amount,
        `Payment for invoice ${inv.invoiceNumber}`,
        userId,
        inv.id,
      );
    }

    const paid = Number(inv.paidAmount || 0) + amount;
    const due  = Number(inv.total) - paid;

    inv.paidAmount           = paid;
    inv.dueAmount            = Math.max(due, 0);
    inv.paymentMethod        = dto.paymentMethod;
    inv.paymentTransactionId = dto.transactionId;
    inv.paidAt               = new Date();
    inv.status               = due <= 0 ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID;

    const saved = await this.repo.save(inv);

    if (saved.status === InvoiceStatus.PAID && saved.appointmentId) {
      await this.aptRepo.update({ id: saved.appointmentId }, { isPaid: true });
    }

    if (saved.status === InvoiceStatus.PAID || saved.status === InvoiceStatus.PARTIALLY_PAID) {
      for (const item of (saved.items || [])) {
        await this.deductStockForItem(clinicId, item, saved, userId);
      }
      await this.triggerCommission(saved);
      this.notifyJwantraInvoicePaid(clinicId, saved);
      this.postInvoiceJournal(clinicId, saved, userId);
    }

    return saved;
  }

  async remove(clinicId: string, id: string): Promise<void> {
    await this.findOne(clinicId, id);
    // Delete linked commission rows first — FK on doctor_commissions.invoiceId has no cascade
    await this.commissionsService.deleteByInvoice(clinicId, id);
    await this.repo.delete({ id, clinicId });
  }

  /**
   * Backfills journal postings for invoices that were already paid/partially
   * paid before this invoice existed for the clinic's chart of accounts
   * (either the clinic predates auto-seeding, or the COA simply hadn't been
   * seeded yet when the payment was recorded — see JournalService.
   * postInvoicePayment, which silently skips posting in that case). Safe to
   * re-run any time: postInvoicePayment() only posts the unposted delta for
   * each invoice, so already-reconciled invoices are cheap no-ops.
   */
  async reconcileJournal(clinicId: string, userId: string): Promise<{ scanned: number; posted: number }> {
    const invoices = await this.repo.find({
      where: [
        { clinicId, status: InvoiceStatus.PAID },
        { clinicId, status: InvoiceStatus.PARTIALLY_PAID },
      ],
      // NOTE: `items` is a plain jsonb/simple-json column on Invoice, not a
      // TypeORM relation — it's already included on every find() by
      // default. Do NOT add it to a `relations: [...]` array; TypeORM
      // throws "Relation ... was not found" at runtime for a non-relation
      // property, which is what caused reconcile-finance to 500.
    });
    let posted = 0;
    for (const invoice of invoices) {
      const entry = await this.journalService.postInvoicePayment(clinicId, invoice, userId);
      if (entry) posted++;
    }
    return { scanned: invoices.length, posted };
  }

  async getAgingReport(clinicId: string, branchId?: string) {
    const now = new Date();
    const where: any = { clinicId, status: InvoiceStatus.OVERDUE };
    if (branchId) where.branchId = branchId;
    const invoices = await this.repo.find({ where, relations: ['patient'] });

    const buckets = { current: 0, days30: 0, days60: 0, days90plus: 0, total: 0 };
    const items = invoices.map((inv: any) => {
      const due  = inv.dueDate ? new Date(inv.dueDate) : now;
      const days = Math.max(0, Math.floor((now.getTime() - due.getTime()) / 86400000));
      const amt  = Number(inv.dueAmount ?? 0);
      buckets.total += amt;
      if (days <= 0)       buckets.current   += amt;
      else if (days <= 30) buckets.days30     += amt;
      else if (days <= 60) buckets.days60     += amt;
      else                 buckets.days90plus += amt;
      return { id: inv.id, invoiceNumber: inv.invoiceNumber, patientName: inv.patient ? `${inv.patient.firstName} ${inv.patient.lastName}` : '', amount: amt, dueDate: inv.dueDate, daysOverdue: days };
    });
    return { ...buckets, items: items.sort((a, b) => b.daysOverdue - a.daysOverdue) };
  }

  async getAnalytics(clinicId: string, query?: any) {
    const branchId = query?.branchId as string | undefined;

    const base = () => {
      const qb = this.repo
        .createQueryBuilder('i')
        .where('i.clinicId = :clinicId', { clinicId });
      if (branchId) qb.andWhere('i.branchId = :branchId', { branchId });
      return qb;
    };

    const totalRevRaw = await base()
      .andWhere('i.status IN (:...paidStatuses)', { paidStatuses: [InvoiceStatus.PAID, InvoiceStatus.PARTIALLY_PAID] })
      .select('COALESCE(SUM(i.paidAmount), 0)', 'val')
      .getRawOne();

    const outstandingRaw = await base()
      .andWhere('i.status NOT IN (:...excl)', { excl: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED, InvoiceStatus.REFUNDED] })
      .select('COALESCE(SUM(i.dueAmount), 0)', 'val')
      .getRawOne();

    // NOTE: date_trunc()/now()/INTERVAL/TO_CHAR() below used to be raw
    // Postgres-only SQL. That's fine on the hosted server, but this method
    // runs identically on the Electron/SQLite offline build (billing is an
    // OFFLINE-CAPABLE module — see typeorm-options.factory.ts's
    // OFFLINE_MODULES list), and better-sqlite3 has none of those
    // functions. Every call to GET /billing/analytics on the desktop app
    // threw "no such function: date_trunc" (wrapped as a 500 by
    // AllExceptionsFilter). Fixed by computing the date boundaries in JS
    // (using the app's existing Nepal-timezone helpers, so "today" and
    // "this month" mean clinic-local Nepal time either way, not the DB
    // server's clock) and binding them as plain parameters — this works
    // identically on Postgres and SQLite.
    const { year, month } = nepalTodayParts();
    const monthStart = nepalWallClockToUTC(year, month, 1, 0, 0);
    const nextMonth  = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
    const monthEnd   = nepalWallClockToUTC(nextMonth.y, nextMonth.m, 1, 0, 0);
    const { start: todayStart, end: todayEnd } = nepalDayBoundsUTC(0);

    const paidMonthRaw = await base()
      .andWhere('i.status IN (:...paidStatuses)', { paidStatuses: [InvoiceStatus.PAID, InvoiceStatus.PARTIALLY_PAID] })
      .andWhere('i.paidAt >= :monthStart AND i.paidAt < :monthEnd', { monthStart, monthEnd })
      .select('COALESCE(SUM(i.paidAmount), 0)', 'val')
      .getRawOne();

    const todayRevRaw = await base()
      .andWhere('i.status IN (:...paidStatuses)', { paidStatuses: [InvoiceStatus.PAID, InvoiceStatus.PARTIALLY_PAID] })
      .andWhere('i.paidAt >= :todayStart AND i.paidAt <= :todayEnd', { todayStart, todayEnd })
      .select('COALESCE(SUM(i.paidAmount), 0)', 'val')
      .getRawOne();

    // Last 7 Nepal-local days' revenue, grouped in JS instead of with
    // driver-specific date-truncation/formatting SQL — portable across
    // Postgres and SQLite, and avoids a second timezone (DB server vs.
    // Nepal clinic time) entering the picture at all.
    const sevenDaysAgoStart = nepalDayBoundsUTC(6).start;
    const rawInvoices = await base()
      .andWhere('i.status IN (:...paidStatuses)', { paidStatuses: [InvoiceStatus.PAID, InvoiceStatus.PARTIALLY_PAID] })
      .andWhere('i.paidAt >= :sevenDaysAgoStart', { sevenDaysAgoStart })
      .select(['i.paidAt AS "paidAt"', 'i.paidAmount AS "paidAmount"'])
      .getRawMany();

    const dayBuckets = new Map<string, number>();
    const dayLabels: string[] = [];
    for (let daysAgo = 6; daysAgo >= 0; daysAgo--) {
      const { start } = nepalDayBoundsUTC(daysAgo);
      const key = start.toISOString().slice(0, 10); // YYYY-MM-DD (Nepal-local day)
      dayBuckets.set(key, 0);
      dayLabels.push(key);
    }
    for (const row of rawInvoices) {
      const paidAt = new Date(row.paidAt);
      // Bucket by Nepal-local calendar day, not UTC day.
      const shifted = new Date(paidAt.getTime() + 5 * 60 * 60 * 1000 + 45 * 60 * 1000);
      const key = shifted.toISOString().slice(0, 10);
      if (dayBuckets.has(key)) {
        dayBuckets.set(key, (dayBuckets.get(key) ?? 0) + Number(row.paidAmount || 0));
      }
    }
    const revenueChart = dayLabels.map((key) => ({
      date: new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kathmandu', weekday: 'short' })
        .format(new Date(`${key}T12:00:00Z`)), // noon UTC keeps us clear of the day boundary regardless of host TZ
      revenue: dayBuckets.get(key) ?? 0,
    }));

    return {
      totalRevenue:  Number(totalRevRaw?.val  ?? 0),
      outstanding:   Number(outstandingRaw?.val ?? 0),
      paidThisMonth: Number(paidMonthRaw?.val  ?? 0),
      todayRevenue:  Number(todayRevRaw?.val   ?? 0),
      revenueChart,
    };
  }
}