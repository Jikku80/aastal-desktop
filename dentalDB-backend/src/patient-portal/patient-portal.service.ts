import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { parseAsNepalTime } from '../common/utils/timezone.util';
import { PatientAccount } from '../patient-auth/entities/patient-account.entity';
import { PatientAccountLink, FamilyRelation, LinkVerificationStatus } from '../patient-auth/entities/patient-account-link.entity';
import { PatientRecordConsentService } from '../patient-auth/patient-record-consent.service';
import { Appointment } from '../appointments/entities/appointment.entity';
import { ClinicalRecord, Prescription } from '../clinical-records/entities/clinical-record.entity';
import { Patient, Gender as PatientGender } from '../patients/entities/patient.entity';
import { Clinic } from '../clinics/entities/clinic.entity';
import { VideoProviderService } from '../telehealth/video-provider.service';
import { FilesService } from '../files/files.service';
import { BloodTestService } from '../blood-test/blood-test.service';
import { LabWorkService } from '../lab-work/lab-work.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NotificationType } from '../notifications/entities/notification.entity';
import { HealthSummaryPdfService } from './health-summary-pdf.service';
import { RefillRequest, RefillRequestStatus } from '../doctor-portal/entities/refill-request.entity';
import { Referral } from '../doctor-portal/entities/referral.entity';

@Injectable()
export class PatientPortalService {
  constructor(
    @InjectRepository(PatientAccount) private accountRepo: Repository<PatientAccount>,
    @InjectRepository(PatientAccountLink) private linkRepo: Repository<PatientAccountLink>,
    @InjectRepository(Appointment) private apptRepo: Repository<Appointment>,
    @InjectRepository(ClinicalRecord) private recordRepo: Repository<ClinicalRecord>,
    @InjectRepository(Patient) private patientRepo: Repository<Patient>,
    @InjectRepository(Clinic) private clinicRepo: Repository<Clinic>,
    @InjectRepository(RefillRequest) private refillRequestRepo: Repository<RefillRequest>,
    @InjectRepository(Referral) private referralRepo: Repository<Referral>,
    private readonly videoProvider: VideoProviderService,
    private readonly filesService: FilesService,
    private readonly bloodTestService: BloodTestService,
    private readonly labWorkService: LabWorkService,
    private readonly notificationsService: NotificationsService,
    private readonly notificationsGateway: NotificationsGateway,
    private readonly healthSummaryPdfService: HealthSummaryPdfService,
    private readonly recordConsentService: PatientRecordConsentService,
  ) {}

  // ── Profile ───────────────────────────────────────────────────────────────

  async getProfile(patientAccountId: string): Promise<PatientAccount> {
    const account = await this.accountRepo.findOne({ where: { id: patientAccountId } });
    if (!account) throw new NotFoundException('Account not found');
    return account;
  }

  async updateProfile(patientAccountId: string, dto: Partial<PatientAccount>): Promise<PatientAccount> {
    delete (dto as any).otpHash;
    delete (dto as any).otpExpires;
    delete (dto as any).refreshToken;

    // Normalize blank strings to null so we don't trip the partial unique
    // index on phone/email (a unique index still enforces uniqueness among
    // non-null values, but an empty string is a valid "value" to Postgres).
    if (typeof dto.phone === 'string') dto.phone = dto.phone.trim() || (null as any);
    if (typeof dto.email === 'string') dto.email = dto.email.trim() || (null as any);

    // Guard against claiming a phone/email that already belongs to a
    // *different* patient account — without this check, logging in later
    // with that identifier would silently land on the other person's
    // account data, and saving used to bubble up as a raw 500 from the
    // unique-index violation.
    if (dto.phone) {
      const existing = await this.accountRepo.findOne({ where: { phone: dto.phone } });
      if (existing && existing.id !== patientAccountId) {
        throw new BadRequestException('This phone number is already linked to another account.');
      }
    }
    if (dto.email) {
      const existing = await this.accountRepo.findOne({ where: { email: dto.email } });
      if (existing && existing.id !== patientAccountId) {
        throw new BadRequestException('This email address is already linked to another account.');
      }
    }

    await this.accountRepo.update(patientAccountId, dto);
    return this.getProfile(patientAccountId);
  }

  // ── Family members ────────────────────────────────────────────────────────

  /**
   * Returns every PatientAccountLink for this account, but first scans for
   * clinic-side Patient records — across ALL clinics and branches — whose
   * phone or email matches this account's contact details and that aren't
   * linked yet. This is what lets a patient who has visited several
   * independent clinics (each of which created its own local Patient row
   * with no knowledge of the others) see all their appointments,
   * prescriptions, and invoices in one portal once they log in with either
   * the phone or email that those clinic records used.
   */
  private async getLinkedRecords(patientAccountId: string): Promise<PatientAccountLink[]> {
    const account = await this.accountRepo.findOne({ where: { id: patientAccountId } });
    if (!account) return [];

    const existingLinks = await this.linkRepo.find({ where: { patientAccountId } });
    const linkedPatientIds = new Set(existingLinks.map(l => l.clinicPatientId).filter(Boolean));

    // Clinic staff enter phone numbers inconsistently (+977 prefix, spaces,
    // dashes), and the account's own phone is stored as the patient typed it
    // during OTP login — so an exact string match misses real matches like
    // "+977 9845657898" vs "9845657898". Normalize to the last 10 digits on
    // both sides before comparing. Email is matched case-insensitively for
    // the same reason (clinic staff may have typed it with different casing).
    const normalizedPhone = account.phone ? account.phone.replace(/\D/g, '').slice(-10) : null;
    const normalizedEmail = account.email ? account.email.trim().toLowerCase() : null;

    let allLinks = existingLinks;

    if (normalizedPhone || normalizedEmail) {
      const qb = this.patientRepo.createQueryBuilder('p');
      if (normalizedPhone) {
        qb.orWhere(`RIGHT(REGEXP_REPLACE(p.phone, '\\D', '', 'g'), 10) = :normalizedPhone`, { normalizedPhone });
      }
      if (normalizedEmail) {
        qb.orWhere('LOWER(p.email) = :normalizedEmail', { normalizedEmail });
      }
      const matches = await qb.getMany();
      const newLinks = matches.filter(m => !linkedPatientIds.has(m.id));
      if (newLinks.length > 0) {
        await this.linkRepo.save(
          newLinks.map(m => this.linkRepo.create({
            patientAccountId,
            clinicPatientId: m.id,
            relation: FamilyRelation.SELF,
            verificationStatus: LinkVerificationStatus.AUTO_MATCHED,
          })),
        );
        allLinks = await this.linkRepo.find({ where: { patientAccountId } });
      }
    }

    // A claim that hasn't been confirmed yet (or was rejected) must never
    // surface clinic data — only auto-matched or verified links count.
    return allLinks.filter(l =>
      l.verificationStatus === LinkVerificationStatus.AUTO_MATCHED ||
      l.verificationStatus === LinkVerificationStatus.VERIFIED ||
      l.verificationStatus == null, // pre-existing rows from before this column existed
    );
  }

  async getFamilyMembers(patientAccountId: string): Promise<PatientAccountLink[]> {
    // Family members list intentionally shows pending claims too (with their
    // status), so the patient can see what they searched for and its state —
    // unlike getLinkedRecords(), which is used for data aggregation.
    await this.getLinkedRecords(patientAccountId); // ensures auto-matching has run
    return this.linkRepo.find({ where: { patientAccountId }, order: { createdAt: 'DESC' } });
  }

  async addFamilyMember(patientAccountId: string, dto: Partial<PatientAccountLink>): Promise<PatientAccountLink> {
    return this.linkRepo.save(this.linkRepo.create({ ...dto, patientAccountId }));
  }

  async removeFamilyMember(id: string, patientAccountId: string): Promise<void> {
    const link = await this.linkRepo.findOne({ where: { id, patientAccountId } });
    if (!link) throw new NotFoundException('Family member not found');
    await this.linkRepo.delete(id);
  }

  // ── Appointments ──────────────────────────────────────────────────────────

  async getAppointments(patientAccountId: string, filter: { upcoming?: boolean } = {}): Promise<any> {
    const links = await this.getLinkedRecords(patientAccountId);
    const patientIds = links.map(l => l.clinicPatientId).filter(Boolean);

    if (patientIds.length === 0) return { data: [], total: 0 };

    const qb = this.apptRepo.createQueryBuilder('appt')
      .leftJoinAndSelect('appt.dentist', 'doctor')
      .leftJoinAndSelect('appt.service', 'service')
      .leftJoinAndSelect('appt.branch', 'branch')
      .where('appt.patientId IN (:...patientIds)', { patientIds })
      .orderBy('appt.scheduledAt', 'DESC');

    if (filter.upcoming) {
      qb.andWhere('appt.scheduledAt >= :now', { now: new Date() });
    }

    const [rows, total] = await qb.getManyAndCount();

    // Enrich with clinic name — the appointment only stores clinicId (no relation),
    // so we batch-fetch all distinct clinic records to avoid N+1 queries.
    const clinicIds = [...new Set(rows.map(r => (r as any).clinicId).filter(Boolean))];
    const clinics = clinicIds.length > 0
      ? await this.clinicRepo.find({ where: { id: In(clinicIds) }, select: ['id', 'name', 'address'] as any })
      : [];
    const clinicMap = new Map(clinics.map((c: any) => [c.id, c]));

    const data = rows.map(appt => ({
      ...appt,
      clinic: (appt as any).clinicId ? (clinicMap.get((appt as any).clinicId) ?? null) : null,
    }));

    return { data, total };
  }

  async bookAppointment(patientAccountId: string, dto: {
    clinicId?: string;
    branchId?: string;
    doctorUserId?: string;
    serviceId?: string;
    scheduledAt: string;
    consultationType?: string;
    bookingContext?: string;
    independentLocationId?: string;
    notes?: string;
  }): Promise<Appointment> {
    let patientId: string | null = null;

    if (dto.bookingContext !== 'independent') {
      if (!dto.clinicId) {
        throw new BadRequestException('A clinic must be selected to book this appointment.');
      }
      patientId = await this.resolveOrCreateClinicPatientId(patientAccountId, dto.clinicId, dto.branchId);
    }

    const scheduledAt = parseAsNepalTime(dto.scheduledAt);
    const endsAt = new Date(scheduledAt.getTime() + 30 * 60 * 1000);

    const appt = this.apptRepo.create({
      clinicId:              dto.clinicId || null,
      branchId:              dto.branchId || null,
      patientId:             patientId || null,
      dentistId:             dto.doctorUserId,
      serviceId:             dto.serviceId || null,
      scheduledAt,
      endsAt,
      notes:                 dto.notes,
      consultationType:      dto.consultationType || 'in_person',
      bookingContext:        dto.bookingContext || 'clinic',
      independentLocationId: dto.independentLocationId || null,
    } as any);

    const saved = await this.apptRepo.save(appt);

    // Auto-provision a video room for video appointments so the room URL
    // is available immediately from the portal without a separate call.
    if (dto.consultationType === 'video') {
      try {
        const room = await this.videoProvider.createRoom((saved as any).id);
        await this.apptRepo.update((saved as any).id, {
          videoRoomUrl: room.roomUrl,
          videoRoomId: room.roomId,
        } as any);
        (saved as any).videoRoomUrl = room.roomUrl;
        (saved as any).videoRoomId = room.roomId;
      } catch {
        // Non-fatal: patient can still trigger room creation from portal
      }
    }

    return saved as unknown as Promise<Appointment>;
  }

  /**
   * Finds the clinic-side Patient record this account already maps to at
   * `clinicId` (via PatientAccountLink), or — on a patient's very first
   * booking at that clinic — auto-provisions one from their account profile
   * and links it. Without this, a brand-new patient could never complete
   * their first booking (the old code just threw "No linked patient record
   * found", which only made sense for patients who'd been manually linked
   * by clinic staff beforehand).
   */
  private async resolveOrCreateClinicPatientId(
    patientAccountId: string,
    clinicId: string,
    branchId?: string,
  ): Promise<string> {
    const links = await this.linkRepo.find({ where: { patientAccountId } });
    const clinicPatientIds = links.map(l => l.clinicPatientId).filter(Boolean) as string[];

    if (clinicPatientIds.length > 0) {
      const existingPatient = await this.patientRepo.findOne({
        where: { id: In(clinicPatientIds), clinicId },
      });
      if (existingPatient) return existingPatient.id;
    }

    // No clinic-side record yet for this clinic — create one from the
    // account's profile so the patient doesn't have to fill it in twice.
    const account = await this.accountRepo.findOne({ where: { id: patientAccountId } });
    if (!account) throw new NotFoundException('Account not found');

    const allowedGenders = Object.values(PatientGender) as string[];
    const newPatient = await this.patientRepo.save(this.patientRepo.create({
      clinicId,
      branchId: branchId || null,
      firstName: account.firstName?.trim() || 'Patient',
      lastName: account.lastName?.trim() || '',
      email: account.email || null,
      phone: account.phone || null,
      dateOfBirth: account.dateOfBirth || null,
      gender: allowedGenders.includes(account.gender as any) ? (account.gender as any) : null,
    }));

    await this.linkRepo.save(this.linkRepo.create({
      patientAccountId,
      clinicPatientId: newPatient.id,
      relation: FamilyRelation.SELF,
      isDefault: links.length === 0,
    }));

    return newPatient.id;
  }

  async cancelAppointment(appointmentId: string, patientAccountId: string, reason?: string): Promise<Appointment> {
    const links = await this.linkRepo.find({ where: { patientAccountId } });
    const patientIds = links.map(l => l.clinicPatientId).filter(Boolean);

    // Appointment has no 'clinic' relation (only a clinicId column) — same
    // pattern already used elsewhere in this file: fetch appt, then look up
    // the clinic separately by clinicId.
    const appt = await this.apptRepo.findOne({
      where: { id: appointmentId },
    });

    if (!appt || !patientIds.includes((appt as any).patientId)) {
      throw new NotFoundException('Appointment not found');
    }

    // Enforce clinic cancellation window
    const clinic = (appt as any).clinicId
      ? await this.clinicRepo.findOne({ where: { id: (appt as any).clinicId } })
      : null;
    const windowHours = (clinic as any)?.cancellationWindowHours ?? 24;
    const hoursUntil = (new Date((appt as any).scheduledAt).getTime() - Date.now()) / 3600000;
    if (hoursUntil < windowHours) {
      throw new BadRequestException(`Cannot cancel within ${windowHours} hours of the appointment`);
    }

    (appt as any).status = 'cancelled';
    if (reason) (appt as any).cancellationReason = reason;
    return this.apptRepo.save(appt);
  }

  // ── Records ───────────────────────────────────────────────────────────────

  async getPrescriptions(patientAccountId: string): Promise<any> {
    const links = await this.getLinkedRecords(patientAccountId);
    const patientIds = links.map(l => l.clinicPatientId).filter(Boolean);
    if (patientIds.length === 0) return { data: [], total: 0 };

    const [data, total] = await this.recordRepo.findAndCount({
      where: patientIds.map(id => ({ patientId: id })),
      relations: ['prescriptions'],
      order: { createdAt: 'DESC' } as any,
    });
    return { data, total };
  }

  /**
   * Resolves clinicId -> clinic name for a set of clinic-side patientIds, so
   * cross-clinic timeline items can be tagged with a human-readable source.
   * Most patients won't remember which clinic a given report came from.
   */
  private async getClinicNamesForPatientIds(patientIds: string[]): Promise<{
    clinicIdByPatientId: Map<string, string>;
    clinicNameById: Map<string, string>;
  }> {
    const clinicIdByPatientId = new Map<string, string>();
    const clinicNameById = new Map<string, string>();
    if (patientIds.length === 0) return { clinicIdByPatientId, clinicNameById };

    const patients = await this.patientRepo.find({
      where: { id: In(patientIds) },
      select: ['id', 'clinicId'],
    });
    patients.forEach(p => clinicIdByPatientId.set(p.id, p.clinicId));

    const clinicIds = [...new Set(patients.map(p => p.clinicId).filter(Boolean))];
    if (clinicIds.length > 0) {
      const clinics = await this.clinicRepo.find({
        where: { id: In(clinicIds) },
        select: ['id', 'name'],
      });
      clinics.forEach(c => clinicNameById.set(c.id, c.name));
    }

    return { clinicIdByPatientId, clinicNameById };
  }

  /**
   * Cross-clinic reports & lab results timeline. Merges patient files,
   * blood-test orders/results, and clinical-record attachments from every
   * clinic this account is linked to (via getLinkedRecords / PatientAccountLink
   * — never a clinicId the caller supplies), each item tagged with the
   * source clinic so the patient can tell where it came from.
   */
  async getReports(patientAccountId: string): Promise<any> {
    const links = await this.getLinkedRecords(patientAccountId);
    const patientIds = links.map(l => l.clinicPatientId).filter(Boolean) as string[];
    if (patientIds.length === 0) return { data: [], total: 0 };

    const [files, bloodTests, labWorks, records, { clinicIdByPatientId, clinicNameById }] = await Promise.all([
      this.filesService.findByPatientIds(patientIds),
      this.bloodTestService.findByPatientIds(patientIds),
      this.labWorkService.findByPatientIds(patientIds),
      this.recordRepo.find({
        where: patientIds.map(id => ({ patientId: id })),
        order: { createdAt: 'DESC' } as any,
      }),
      this.getClinicNamesForPatientIds(patientIds),
    ]);

    const clinicTag = (patientId: string) => {
      const clinicId = clinicIdByPatientId.get(patientId);
      return {
        clinicId: clinicId || null,
        clinicName: (clinicId && clinicNameById.get(clinicId)) || 'Unknown Clinic',
      };
    };

    const timeline: any[] = [];

    files.forEach(f => timeline.push({
      id: f.id,
      kind: 'file',
      category: f.category,
      title: f.originalName,
      description: f.description || null,
      mimeType: f.mimeType,
      createdAt: f.createdAt,
      downloadUrl: `/patient/reports/files/${f.id}/download`,
      ...clinicTag(f.patientId),
    }));

    bloodTests.forEach(b => timeline.push({
      id: b.id,
      kind: 'blood_test',
      category: b.testType,
      title: b.testName,
      description: b.resultSummary || null,
      status: b.status,
      results: b.results || null,
      labName: b.labName || null,
      createdAt: b.createdAt,
      attachments: b.attachments || [],
      ...clinicTag(b.patientId),
    }));

    labWorks.forEach(l => timeline.push({
      id: l.id,
      kind: 'lab_work',
      category: (l as any).testType,
      title: l.testName,
      description: l.resultSummary || null,
      status: l.status,
      results: l.results || null,
      labName: l.labName || null,
      createdAt: l.createdAt,
      attachments: (l as any).attachments || [],
      ...clinicTag(l.patientId),
    }));

    records.forEach(r => {
      (r.attachments || []).forEach((a: any, i: number) => timeline.push({
        id: `${r.id}-attachment-${i}`,
        kind: 'clinical_record_attachment',
        category: a.type || 'document',
        title: a.name,
        description: r.diagnosisNotes || null,
        url: a.url,
        createdAt: r.createdAt,
        ...clinicTag(r.patientId),
      }));
    });

    timeline.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return { data: timeline, total: timeline.length };
  }

  /**
   * Resolves a PatientFile for download/preview, scoped through this
   * account's PatientAccountLink rows — never by clinicId — so a patient
   * can never fetch another account's file.
   */
  async getReportFileForDownload(patientAccountId: string, fileId: string) {
    const links = await this.getLinkedRecords(patientAccountId);
    const patientIds = links.map(l => l.clinicPatientId).filter(Boolean);

    const file = await this.filesService.findOneById(fileId);
    if (!patientIds.includes(file.patientId)) {
      throw new NotFoundException('File not found');
    }
    return file;
  }



  // ── Invoices ──────────────────────────────────────────────────────────────

  async getInvoices(patientAccountId: string): Promise<any> {
    const links = await this.getLinkedRecords(patientAccountId);
    const patientIds = links.map(l => l.clinicPatientId).filter(Boolean);
    if (patientIds.length === 0) return { data: [], total: 0 };

    const invoiceRepo = this.apptRepo.manager.getRepository('Invoice');
    // Invoice only stores clinicId (no `clinic` relation exists on the
    // entity — same situation as appointments above), so
    // leftJoinAndSelect('inv.clinic', ...) throws
    // "Relation with property path clinic ... was not found". Batch-fetch
    // clinics separately and merge in JS instead, to avoid N+1 queries.
    const [rows, total] = await invoiceRepo.createQueryBuilder('inv')
      .where('inv.patientId IN (:...patientIds)', { patientIds })
      .orderBy('inv.createdAt', 'DESC')
      .getManyAndCount();

    const clinicIds = [...new Set(rows.map(r => (r as any).clinicId).filter(Boolean))];
    const clinics = clinicIds.length > 0
      ? await this.clinicRepo.find({ where: { id: In(clinicIds) }, select: ['id', 'name', 'address'] as any })
      : [];
    const clinicMap = new Map(clinics.map((c: any) => [c.id, c]));

    const data = rows.map(inv => ({
      ...inv,
      clinic: (inv as any).clinicId ? (clinicMap.get((inv as any).clinicId) ?? null) : null,
    }));

    return { data, total };
  }

  async payInvoice(invoiceId: string, patientAccountId: string): Promise<any> {
    const links = await this.linkRepo.find({ where: { patientAccountId } });
    const patientIds = links.map(l => l.clinicPatientId).filter(Boolean);

    // Invoice has no `clinic` relation (only a plain `clinicId` column — see
    // getInvoices() above), so `relations: ['clinic']` throws "Relation
    // with property path clinic was not found" on every call. This is the
    // TypeORM crash that broke "Pay Invoice" on the patient portal (mobile
    // + web). Fetch the clinic manually instead, same pattern as getInvoices.
    const invoiceRepo = this.apptRepo.manager.getRepository('Invoice');
    const invoice = await invoiceRepo.findOne({ where: { id: invoiceId } });

    if (!invoice || !patientIds.includes((invoice as any).patientId)) {
      throw new NotFoundException('Invoice not found');
    }

    const clinicId = (invoice as any).clinicId;
    const clinic = clinicId
      ? await this.clinicRepo.findOne({ where: { id: clinicId }, select: ['id', 'name', 'address'] as any })
      : null;

    const paymentUrl = `${process.env.FRONTEND_URL || 'https://www.clinickarobar.com'}/pay?invoiceId=${invoiceId}`;
    return { invoice: { ...invoice, clinic }, paymentUrl, message: 'Redirect to payment gateway' };
  }

  // ── Reschedule ────────────────────────────────────────────────────────────

  async rescheduleAppointment(appointmentId: string, patientAccountId: string, newScheduledAt: string): Promise<any> {
    const links = await this.linkRepo.find({ where: { patientAccountId } });
    const patientIds = links.map(l => l.clinicPatientId).filter(Boolean);

    const appt = await this.apptRepo.findOne({ where: { id: appointmentId } });
    if (!appt || !patientIds.includes((appt as any).patientId)) {
      throw new NotFoundException('Appointment not found');
    }

    const scheduledAt = new Date(newScheduledAt);
    if (isNaN(scheduledAt.getTime())) throw new BadRequestException('Invalid date');

    const hoursUntilOld = (new Date((appt as any).scheduledAt).getTime() - Date.now()) / 3600000;
    if (hoursUntilOld < 2) throw new BadRequestException('Cannot reschedule within 2 hours of the appointment');

    (appt as any).scheduledAt = scheduledAt;
    return this.apptRepo.save(appt);
  }

  async getHealthSummary(patientAccountId: string): Promise<any> {
    const [appointments, records] = await Promise.all([
      this.getAppointments(patientAccountId),
      this.getPrescriptions(patientAccountId),
    ]);

    const completedVisits = (appointments.data || []).filter((a: any) => a.status === 'completed');
    return {
      totalVisits: completedVisits.length,
      totalPrescriptions: (records.data || []).reduce(
        (sum: number, r: any) => sum + (r.prescriptions?.length || 0), 0
      ),
      lastVisit: completedVisits[0]?.scheduledAt || null,
      visits: completedVisits.slice(0, 10).map((a: any) => ({
        id:     a.id,
        date:   a.scheduledAt,
        clinic: a.clinic?.name,
        doctor: a.dentist ? `${a.dentist.firstName} ${a.dentist.lastName}` : null,
        notes:  a.notes,
      })),
    };
  }

  // ── Health Summary PDF Export ─────────────────────────────────────────────

  async exportHealthSummaryPdf(patientAccountId: string): Promise<Buffer> {
    const account = await this.accountRepo.findOne({ where: { id: patientAccountId } });
    if (!account) throw new NotFoundException('Account not found');

    const links = await this.getLinkedRecords(patientAccountId);
    const patientIds = links.map(l => l.clinicPatientId).filter(Boolean);
    const clinicMap = await this.getClinicNamesForPatientIds(patientIds);

    // Collect completed visits across all clinics
    const clinicalRecords = patientIds.length
      ? await this.recordRepo.find({
          where: { patientId: In(patientIds) } as any,
          order: { createdAt: 'DESC' as any },
          take: 20,
        })
      : [];

    const visits = clinicalRecords.map((r: any) => ({
      date: r.createdAt,
      clinicName: clinicMap[r.patientId]?.name || 'Unknown Clinic',
      doctorName: r.doctor ? `Dr. ${r.doctor.firstName} ${r.doctor.lastName}` : 'Unknown Doctor',
      diagnosis: r.diagnosisNotes,
      notes: r.treatmentPlan,
    }));

    // Collect medications from prescriptions embedded in clinical records
    const medications: any[] = [];
    for (const r of clinicalRecords) {
      const clinicName = clinicMap[(r as any).patientId]?.name || 'Unknown Clinic';
      ((r as any).prescriptions || []).forEach((p: any) => {
        medications.push({
          name: p.medicineName,
          dosage: p.dosage,
          frequency: p.frequency,
          clinicName,
          prescribedAt: r.createdAt,
        });
      });
    }

    // Collect lab results from reports (blood tests + lab work)
    const reportsResult = await this.getReports(patientAccountId);
    const labResults = (reportsResult.data || [])
      .filter((item: any) => item.kind === 'blood_test' || item.kind === 'lab_work')
      .map((item: any) => ({
        title: item.title,
        clinicName: item.clinicName,
        date: item.date ?? item.createdAt,
        summary: item.description,
        results: item.results || [],
      }));

    return this.healthSummaryPdfService.generatePdf({
      account: {
        firstName: account.firstName || '',
        lastName: account.lastName || '',
        phone: account.phone,
        email: account.email,
        dateOfBirth: account.dateOfBirth,
        gender: account.gender,
        allergies: (account as any).allergies,
        chronicConditions: (account as any).chronicConditions,
        vitals: (account as any).vitals,
      },
      visits,
      medications,
      labResults,
      generatedAt: new Date(),
    });
  }

  // ── Prescription Refill Request ───────────────────────────────────────────

  async requestRefill(patientAccountId: string, prescriptionId: string): Promise<{ message: string }> {
    const account = await this.accountRepo.findOne({ where: { id: patientAccountId } });
    if (!account) throw new NotFoundException('Account not found');

    // Find the clinical record containing this prescription (prescriptions
    // is a real OneToMany relation, eager-loaded — join on the child table).
    const record = await this.recordRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.prescriptions', 'allRx')
      .innerJoin('r.prescriptions', 'rx', 'rx.id = :prescriptionId', { prescriptionId })
      .getOne();

    if (!record) {
      throw new NotFoundException('Prescription not found');
    }

    // Verify patient owns this record
    const links = await this.getLinkedRecords(patientAccountId);
    const patientIds = links.map(l => l.clinicPatientId).filter(Boolean);
    if (!patientIds.includes((record as any).patientId)) {
      throw new NotFoundException('Prescription not found');
    }

    const doctorId = (record as any).doctorId ?? (record as any).dentistId ?? (record as any).createdById;
    const clinicId = (record as any).clinicId;
    const patientName = `${account.firstName || ''} ${account.lastName || ''}`.trim() || account.phone || 'Patient';

    const prescription = ((record as any).prescriptions || []).find((p: any) => p.id === prescriptionId);

    await this.refillRequestRepo.save(this.refillRequestRepo.create({
      patientAccountId,
      clinicPatientId: (record as any).patientId,
      clinicId,
      doctorId: doctorId || null,
      sourceRecordId: record.id,
      prescriptionId,
      medicineName: prescription?.medicineName || 'Unknown medication',
      dosage: prescription?.dosage || null,
      frequency: prescription?.frequency || null,
      duration: prescription?.duration || null,
      instructions: prescription?.instructions || null,
      status: RefillRequestStatus.PENDING,
    }));

    if (doctorId) {
      const notif = await this.notificationsService.create({
        userId: doctorId,
        clinicId,
        type: NotificationType.REFILL_REQUESTED,
        title: 'Refill Request',
        body: `${patientName} has requested a prescription refill.`,
        link: '/doctor/refill-requests',
        entityId: record.id,
      } as any);
      this.notificationsGateway.emitToUser(doctorId, 'notification', notif);
    }

    return { message: 'Refill request sent to your doctor.' };
  }

  // ── Cross-Clinic History Sharing Consent ──────────────────────────────────

  /**
   * Every clinic this account is linked to, tagged with whether the patient
   * has opted in to letting that clinic view their full cross-clinic
   * history. Used by portal/consents to render the "Share full history
   * with [Clinic Name]" toggles.
   */
  async getConsentClinics(patientAccountId: string): Promise<any> {
    const links = await this.getLinkedRecords(patientAccountId);
    const patientIds = links.map(l => l.clinicPatientId).filter(Boolean) as string[];
    if (patientIds.length === 0) return { data: [] };

    const { clinicIdByPatientId, clinicNameById } = await this.getClinicNamesForPatientIds(patientIds);
    const clinicIds = [...new Set([...clinicIdByPatientId.values()].filter(Boolean))];
    const consentMap = await this.recordConsentService.getConsentMap(patientAccountId);

    return {
      data: clinicIds.map(clinicId => ({
        clinicId,
        clinicName: clinicNameById.get(clinicId) || 'Unknown Clinic',
        granted: consentMap.get(clinicId) ?? false,
      })),
    };
  }

  async setConsent(patientAccountId: string, clinicId: string, granted: boolean): Promise<any> {
    // Only allow toggling consent for clinics this account is actually linked to.
    const { data } = await this.getConsentClinics(patientAccountId);
    if (!data.some((c: any) => c.clinicId === clinicId)) {
      throw new NotFoundException('You have no linked records at this clinic.');
    }
    const row = await this.recordConsentService.setConsent(patientAccountId, clinicId, granted);
    return { clinicId, granted: row.granted };
  }

  // ── Referrals (patient-facing view) ────────────────────────────────────────

  async getReferrals(patientAccountId: string): Promise<any> {
    const data = await this.referralRepo.find({
      where: { patientAccountId },
      order: { createdAt: 'DESC' },
    });
    return { data, total: data.length };
  }

  // ── Claim a Missed Clinic Record ──────────────────────────────────────────

  async claimRecord(
    patientAccountId: string,
    dto: { clinicSlug: string; firstName: string; lastName: string; dateOfBirth: string },
  ): Promise<{ message: string; linkId: string }> {
    const account = await this.accountRepo.findOne({ where: { id: patientAccountId } });
    if (!account) throw new NotFoundException('Account not found');

    // Find clinic by slug
    const clinic = await this.clinicRepo.findOne({ where: { slug: dto.clinicSlug } as any });
    if (!clinic) throw new NotFoundException('Clinic not found. Check the clinic slug and try again.');

    // Look for a near-match Patient row within this clinic
    const candidates = await this.patientRepo
      .createQueryBuilder('p')
      .where('p.clinicId = :clinicId', { clinicId: clinic.id })
      .andWhere(
        `(LOWER(p."firstName") = LOWER(:firstName) AND LOWER(p."lastName") = LOWER(:lastName))`,
        { firstName: dto.firstName, lastName: dto.lastName },
      )
      .getMany();

    // DOB filter (lenient: just match date part)
    const dob = dto.dateOfBirth ? new Date(dto.dateOfBirth).toISOString().split('T')[0] : null;
    const match = dob
      ? candidates.find(c => {
          const cDob = (c as any).dateOfBirth
            ? new Date((c as any).dateOfBirth).toISOString().split('T')[0]
            : null;
          return cDob === dob;
        }) ?? candidates[0]
      : candidates[0];

    if (!match) {
      throw new NotFoundException(
        'No matching patient record found at this clinic. Please verify your name and date of birth.',
      );
    }

    // Check if already linked
    const existing = await this.linkRepo.findOne({
      where: { patientAccountId, clinicPatientId: match.id } as any,
    });
    if (existing) {
      if (existing.verificationStatus === LinkVerificationStatus.REJECTED) {
        throw new BadRequestException('This record link was previously rejected. Please contact the clinic.');
      }
      return { message: 'This record is already linked to your account.', linkId: existing.id };
    }

    const link = this.linkRepo.create({
      patientAccountId,
      clinicPatientId: match.id,
      relation: FamilyRelation.SELF,
      verificationStatus: LinkVerificationStatus.PENDING_CLAIM,
      claimNote: `Claimed at clinic "${dto.clinicSlug}" as ${dto.firstName} ${dto.lastName}`,
    });
    const saved = await this.linkRepo.save(link);

    return {
      message: 'Claim submitted. A clinic staff member will verify and confirm this record.',
      linkId: saved.id,
    };
  }

  // ── Patient Notifications ──────────────────────────────────────────────────
  // Notifications are clinic-scoped internally, but a patient may be linked to
  // multiple clinics. We fetch notifications across all linked clinicIds,
  // filtered to only appointment/lab/report-relevant types so patients never
  // see internal clinic staff messages (billing, leave, shifts, etc.).

  private readonly PATIENT_NOTIF_TYPES: NotificationType[] = [
    NotificationType.APPOINTMENT_CREATED,
    NotificationType.APPOINTMENT_UPDATED,
    NotificationType.APPOINTMENT_CANCELLED,
    NotificationType.APPOINTMENT_REMINDER,
    NotificationType.REFERRAL_RECEIVED,
    NotificationType.REFILL_APPROVED,
  ];

  private async getPatientClinicIds(patientAccountId: string): Promise<string[]> {
    const links = await this.getLinkedRecords(patientAccountId);
    const patientIds = links.map(l => l.clinicPatientId).filter(Boolean);
    if (patientIds.length === 0) return [];
    const patients = await this.patientRepo.find({
      where: { id: In(patientIds) },
      select: ['id', 'clinicId'] as any,
    });
    return [...new Set(patients.map((p: any) => p.clinicId).filter(Boolean))];
  }

  async getPatientNotifications(patientAccountId: string, limit = 20): Promise<any> {
    const clinicIds = await this.getPatientClinicIds(patientAccountId);
    if (clinicIds.length === 0) return { data: [], total: 0 };

    // Fetch notifications across all linked clinics where type is patient-relevant
    const qb = this.notificationsService.createPatientQueryBuilder(clinicIds, this.PATIENT_NOTIF_TYPES);
    const data = await qb.orderBy('n.createdAt', 'DESC').take(limit).getMany();
    return { data, total: data.length };
  }

  async getPatientNotificationUnreadCount(patientAccountId: string): Promise<number> {
    const clinicIds = await this.getPatientClinicIds(patientAccountId);
    if (clinicIds.length === 0) return 0;
    return this.notificationsService.getPatientUnreadCount(clinicIds, this.PATIENT_NOTIF_TYPES);
  }

  async markPatientNotificationRead(patientAccountId: string, notifId: string): Promise<void> {
    // Verify this notification belongs to a clinic the patient is linked to
    const clinicIds = await this.getPatientClinicIds(patientAccountId);
    if (clinicIds.length === 0) return;
    await this.notificationsService.markReadForPatient(clinicIds, notifId);
  }

  async markAllPatientNotificationsRead(patientAccountId: string): Promise<void> {
    const clinicIds = await this.getPatientClinicIds(patientAccountId);
    if (clinicIds.length === 0) return;
    await this.notificationsService.markAllReadForPatient(clinicIds, this.PATIENT_NOTIF_TYPES);
  }
}