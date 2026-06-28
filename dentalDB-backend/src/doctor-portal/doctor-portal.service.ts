import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ilike } from '../database/sql-helpers';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { Appointment, AppointmentStatus } from '../appointments/entities/appointment.entity';
import { Patient } from '../patients/entities/patient.entity';
import { ClinicalRecord } from '../clinical-records/entities/clinical-record.entity';
import { Invoice } from '../billing/entities/invoice.entity';
import { User } from '../users/entities/user.entity';
import { DoctorProfile } from '../doctor-profile/entities/doctor-profile.entity';
import { DoctorProfileService } from '../doctor-profile/doctor-profile.service';
import { startOfDay, endOfDay } from 'date-fns';
import { PatientAccount } from '../patient-auth/entities/patient-account.entity';
import { PatientAccountLink, LinkVerificationStatus } from '../patient-auth/entities/patient-account-link.entity';
import { PatientRecordConsentService } from '../patient-auth/patient-record-consent.service';
import { PatientPortalService } from '../patient-portal/patient-portal.service';
import { Referral, ReferralStatus } from './entities/referral.entity';
import { RefillRequest, RefillRequestStatus } from './entities/refill-request.entity';
import { Clinic } from '../clinics/entities/clinic.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NotificationType } from '../notifications/entities/notification.entity';

// ── Field routing tables ──────────────────────────────────────────────────────
//
// EXACT list of every @Column on the User entity.
// Anything NOT in this set and not blocked goes to DoctorProfile.
//
const USER_FIELDS = new Set([
  'firstName',
  'lastName',
  'phone',
  'avatar',
  'signatureUrl',
  'nmcNo',
  'isActive',
  'isEmailVerified',
  'commissionRate',
  'baseSalary',
  'lastLoginAt',
]);

// Fields that must never be written by the doctor themselves.
const BLOCKED_FIELDS = new Set([
  'id',
  'email',           // email changes need a separate verify flow
  'password',
  'role',
  'clinicId',
  'refreshToken',
  'emailOtpHash',
  'emailOtpExpires',
  'passwordResetToken',
  'passwordResetExpires',
  'createdAt',
  'updatedAt',
  // DoctorProfile read-only aggregates
  'rating',
  'reviewCount',
  'lastSeenAt',
  'userId',
]);

@Injectable()
export class DoctorPortalService {
  constructor(
    @InjectRepository(Appointment)    private apptRepo:          Repository<Appointment>,
    @InjectRepository(Patient)        private patientRepo:        Repository<Patient>,
    @InjectRepository(ClinicalRecord) private recordRepo:         Repository<ClinicalRecord>,
    @InjectRepository(Invoice)        private invoiceRepo:        Repository<Invoice>,
    @InjectRepository(User)           private userRepo:           Repository<User>,
    @InjectRepository(DoctorProfile)  private doctorProfileRepo:  Repository<DoctorProfile>,
    @InjectRepository(PatientAccount)     private accountRepo:    Repository<PatientAccount>,
    @InjectRepository(PatientAccountLink) private linkRepo:       Repository<PatientAccountLink>,
    @InjectRepository(Referral)       private referralRepo:       Repository<Referral>,
    @InjectRepository(RefillRequest)  private refillRequestRepo:  Repository<RefillRequest>,
    @InjectRepository(Clinic)         private clinicRepo:         Repository<Clinic>,
    private readonly doctorProfileService: DoctorProfileService,
    private readonly recordConsentService: PatientRecordConsentService,
    private readonly patientPortalService: PatientPortalService,
    private readonly notificationsService: NotificationsService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  // ── Stats ─────────────────────────────────────────────────────────────────

  async getStats(doctorId: string) {
    const today      = new Date();
    const todayStart = startOfDay(today);
    const todayEnd   = endOfDay(today);

    const [todayAppointments, pendingAppointments, totalPatients, totalRecords] =
      await Promise.all([
        this.apptRepo.count({
          where: { dentistId: doctorId, scheduledAt: Between(todayStart, todayEnd) },
        }),
        this.apptRepo.count({
          where: { dentistId: doctorId, status: AppointmentStatus.SCHEDULED },
        }),
        this.apptRepo
          .createQueryBuilder('a')
          .select('COUNT(DISTINCT a.patientId)', 'count')
          .where('a.dentistId = :doctorId', { doctorId })
          .getRawOne()
          .then(r => Number(r?.count ?? 0)),
        this.recordRepo.count({ where: { doctorId } }),
      ]);

    return { todayAppointments, pendingAppointments, totalPatients, totalRecords };
  }

  // ── Profile ───────────────────────────────────────────────────────────────

  async getProfile(doctorId: string) {
    const user = await this.userRepo.findOne({ where: { id: doctorId } });
    if (!user) throw new NotFoundException('Doctor not found');

    // Auto-create the DoctorProfile row if it doesn't exist yet
    const dp = await this.doctorProfileService.getOrCreate(doctorId);

    return {
      // ── User fields ──────────────────────────────────────────────────────
      id:              user.id,
      firstName:       user.firstName,
      lastName:        user.lastName,
      email:           user.email,
      phone:           user.phone,
      role:            user.role,
      avatar:          user.avatar,
      signatureUrl:    user.signatureUrl,
      nmcNo:           user.nmcNo,
      clinicId:        user.clinicId,
      isActive:        user.isActive,
      isEmailVerified: user.isEmailVerified,
      createdAt:       user.createdAt,
      updatedAt:       user.updatedAt,
      // ── DoctorProfile fields — flattened for frontend convenience ─────────
      specializations:              dp.specializations  ?? [],
      qualifications:               dp.qualifications   ?? [],
      yearsOfExperience:            dp.yearsOfExperience,
      bio:                          dp.bio,
      consultationFee:              dp.consultationFee,
      videoConsultationFee:         dp.videoConsultationFee,
      languagesSpoken:              dp.languagesSpoken  ?? [],
      profilePhotoUrl:              dp.profilePhotoUrl  ?? user.avatar,
      address:                      dp.address,
      latitude:                     dp.latitude,
      longitude:                    dp.longitude,
      isPubliclyListed:             dp.isPubliclyListed,
      isAvailableForInstantConsult: dp.isAvailableForInstantConsult,
      rating:                       dp.rating,
      reviewCount:                  dp.reviewCount,
    };
  }

  async updateProfile(doctorId: string, dto: Record<string, any>) {
    const userFields:    Record<string, any> = {};
    const profileFields: Record<string, any> = {};

    for (const [key, value] of Object.entries(dto)) {
      // Skip null/undefined values and blocked fields
      if (value === undefined || value === null) continue;
      if (BLOCKED_FIELDS.has(key)) continue;

      if (key === 'specialization') {
        // Accept singular string alias → convert to array for DoctorProfile
        profileFields.specializations = value ? [value] : [];
      } else if (USER_FIELDS.has(key)) {
        userFields[key] = value;
      } else {
        // Everything else (address, latitude, longitude, bio, specializations,
        // qualifications, yearsOfExperience, consultationFee, videoConsultationFee,
        // languagesSpoken, profilePhotoUrl, isPubliclyListed, isAvailableForInstantConsult)
        // → goes to DoctorProfile
        profileFields[key] = value;
      }
    }

    if (Object.keys(userFields).length > 0) {
      await this.userRepo.update(doctorId, userFields);
    }

    if (Object.keys(profileFields).length > 0) {
      await this.doctorProfileService.update(doctorId, profileFields);
    }

    return this.getProfile(doctorId);
  }

  // ── Appointments ──────────────────────────────────────────────────────────

  async getAppointments(doctorId: string, query: {
    status?: string;
    date?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, date, search, page = 1, limit = 20 } = query;

    const qb = this.apptRepo.createQueryBuilder('a')
      .leftJoinAndSelect('a.patient', 'patient')
      .leftJoinAndSelect('a.service', 'service')
      .where('a.dentistId = :doctorId', { doctorId })
      .orderBy('a.scheduledAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (status) qb.andWhere('a.status = :status', { status });
    if (date) {
      const d = new Date(date);
      qb.andWhere('a.scheduledAt BETWEEN :start AND :end', {
        start: startOfDay(d),
        end:   endOfDay(d),
      });
    }
    if (search) {
      qb.andWhere(
        `(patient.firstName ${ilike()} :s OR patient.lastName ${ilike()} :s OR patient.phone ${ilike()} :s)`,
        { s: `%${search}%` },
      );
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async getAppointmentById(doctorId: string, id: string) {
    const appt = await this.apptRepo.findOne({
      where: { id },
      relations: ['patient', 'service', 'branch'],
    });
    if (!appt) throw new NotFoundException('Appointment not found');
    if (appt.dentistId !== doctorId) throw new ForbiddenException();
    return appt;
  }

  async updateAppointmentStatus(
    doctorId: string,
    id: string,
    status: AppointmentStatus,
    notes?: string,
  ) {
    const appt = await this.apptRepo.findOne({ where: { id } });
    if (!appt) throw new NotFoundException('Appointment not found');
    if (appt.dentistId !== doctorId) throw new ForbiddenException();
    await this.apptRepo.update(id, { status, ...(notes ? { notes } : {}) } as any);
    return this.apptRepo.findOne({ where: { id }, relations: ['patient', 'service'] });
  }

  async getTodaySchedule(doctorId: string) {
    const today = new Date();
    return this.apptRepo.find({
      where: {
        dentistId: doctorId,
        scheduledAt: Between(startOfDay(today), endOfDay(today)),
      },
      relations: ['patient', 'service'],
      order: { scheduledAt: 'ASC' },
    });
  }

  // ── Patients ──────────────────────────────────────────────────────────────

  async getPatients(doctorId: string, query: { search?: string; page?: number; limit?: number }) {
    const { search, page = 1, limit = 20 } = query;

    const subQb = this.apptRepo.createQueryBuilder('a')
      .select('DISTINCT a.patientId')
      .where('a.dentistId = :doctorId', { doctorId });

    const qb = this.patientRepo.createQueryBuilder('p')
      .where(`p.id IN (${subQb.getQuery()})`)
      .setParameters(subQb.getParameters())
      .skip((page - 1) * limit)
      .take(limit);

    if (search) {
      qb.andWhere(
        `(p.firstName ${ilike()} :s OR p.lastName ${ilike()} :s OR p.phone ${ilike()} :s OR p.email ${ilike()} :s OR p.opdNo ${ilike()} :s)`,
        { s: `%${search}%` },
      );
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async getPatientById(doctorId: string, patientId: string) {
    const hasAppt = await this.apptRepo.findOne({ where: { dentistId: doctorId, patientId } });
    if (!hasAppt) throw new ForbiddenException('Patient not under your care');

    const patient = await this.patientRepo.findOne({ where: { id: patientId } });
    if (!patient) throw new NotFoundException('Patient not found');

    // Merge in self-reported allergies/conditions from the patient's linked
    // portal account, if any — clinic-recorded and patient-self-reported
    // data can each be incomplete, and this is a safety feature, not optional
    // polish, so we surface the union rather than picking one source.
    const link = await this.linkRepo.findOne({ where: { clinicPatientId: patientId } });
    let accountAllergies: string[] = [];
    let accountConditions: string[] = [];
    if (link) {
      const account = await this.accountRepo.findOne({ where: { id: link.patientAccountId } });
      accountAllergies = account?.allergies || [];
      accountConditions = account?.chronicConditions || [];
    }

    const mergedAllergies = [...new Set([...(patient.allergies || []), ...accountAllergies])];
    const mergedConditions = [...new Set([...(patient.medicalConditions || []), ...accountConditions])];

    return {
      ...patient,
      allergies: mergedAllergies,
      medicalConditions: mergedConditions,
    };
  }

  async getPatientAppointments(doctorId: string, patientId: string) {
    const hasAppt = await this.apptRepo.findOne({ where: { dentistId: doctorId, patientId } });
    if (!hasAppt) throw new ForbiddenException('Patient not under your care');

    return this.apptRepo.find({
      where: { dentistId: doctorId, patientId },
      relations: ['service'],
      order: { scheduledAt: 'DESC' },
    });
  }

  // ── Clinical Records ──────────────────────────────────────────────────────

  async getRecords(doctorId: string, query: { patientId?: string; page?: number; limit?: number }) {
    const { patientId, page = 1, limit = 20 } = query;

    const qb = this.recordRepo.createQueryBuilder('r')
      .leftJoinAndSelect('r.patient', 'patient')
      .where('r.doctorId = :doctorId', { doctorId })
      .orderBy('r.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (patientId) qb.andWhere('r.patientId = :patientId', { patientId });

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async getRecordById(doctorId: string, id: string) {
    const record = await this.recordRepo.findOne({
      where: { id },
      relations: ['patient'],
    });
    if (!record) throw new NotFoundException('Record not found');
    if (record.doctorId !== doctorId) throw new ForbiddenException();
    return record;
  }

  async createRecord(doctorId: string, dto: {
    patientId: string;
    appointmentId?: string;
    diagnosisNotes?: string;
    treatmentPlan?: string;
  }) {
    const appt = await this.apptRepo.findOne({ where: { dentistId: doctorId, patientId: dto.patientId } });
    if (!appt) throw new ForbiddenException('Patient not under your care');

    const record = this.recordRepo.create({
      ...dto,
      doctorId,
      clinicId: appt.clinicId,
    } as any);
    return this.recordRepo.save(record);
  }

  async updateRecord(doctorId: string, id: string, dto: {
    diagnosisNotes?: string;
    treatmentPlan?: string;
  }) {
    const record = await this.recordRepo.findOne({ where: { id } });
    if (!record) throw new NotFoundException('Record not found');
    if (record.doctorId !== doctorId) throw new ForbiddenException();
    await this.recordRepo.update(id, dto as any);
    return this.recordRepo.findOne({ where: { id }, relations: ['patient'] });
  }

  // ── Invoices ──────────────────────────────────────────────────────────────

  async getInvoices(doctorId: string, query: { status?: string; page?: number; limit?: number }) {
    const { status, page = 1, limit = 20 } = query;

    const qb = this.invoiceRepo.createQueryBuilder('i')
      .leftJoinAndSelect('i.patient', 'patient')
      .leftJoinAndSelect('i.appointment', 'appointment')
      .where('appointment.dentistId = :doctorId', { doctorId })
      .orderBy('i.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (status) qb.andWhere('i.status = :status', { status });

    const [data, total] = await qb.getManyAndCount();
    const totalRevenue = data.reduce((sum, i) => sum + Number((i as any).paidAmount || 0), 0);
    return { data, total, page, limit, totalRevenue };
  }

  // ── Cross-Clinic Full History (consent-gated) ──────────────────────────────

  /**
   * Resolves the requesting doctor's clinicId and the clinic-scoped
   * patient's linked PatientAccount, in one place, so every cross-clinic
   * endpoint below enforces "doctor must actually be treating this
   * patient" + "patient must be a portal account" the same way.
   */
  private async resolveDoctorAndAccount(doctorId: string, clinicPatientId: string) {
    const hasAppt = await this.apptRepo.findOne({ where: { dentistId: doctorId, patientId: clinicPatientId } });
    if (!hasAppt) throw new ForbiddenException('Patient not under your care');

    const doctor = await this.userRepo.findOne({ where: { id: doctorId } });
    if (!doctor) throw new NotFoundException('Doctor not found');

    const link = await this.linkRepo.findOne({
      where: { clinicPatientId },
    });

    return { clinicId: doctor.clinicId, doctor, link };
  }

  /**
   * GET /doctor/patients/:patientId/full-history
   *
   * `patientId` is always a clinic-scoped Patient.id. If the patient has a
   * portal account AND has explicitly granted this clinic consent, returns
   * the same merged appointments/prescriptions/reports timeline used by
   * the patient portal (reusing PatientPortalService — never re-implemented
   * here). Otherwise, falls back to this clinic's own records only, plus a
   * CTA the doctor can use to request access.
   */
  async getFullHistory(doctorId: string, clinicPatientId: string) {
    const { clinicId, link } = await this.resolveDoctorAndAccount(doctorId, clinicPatientId);

    // No portal account linked at all — nothing cross-clinic to show.
    if (!link || link.verificationStatus === LinkVerificationStatus.REJECTED) {
      return { consentGranted: false, hasOtherClinicRecords: false, data: null };
    }

    const granted = await this.recordConsentService.isGranted(link.patientAccountId, clinicId);

    if (!granted) {
      // Tell the doctor whether there's actually anything to ask for, so the
      // CTA only shows up when it's meaningful.
      const otherLinks = await this.linkRepo.find({ where: { patientAccountId: link.patientAccountId } });
      const hasOtherClinicRecords = otherLinks.some(l => l.clinicPatientId && l.clinicPatientId !== clinicPatientId);
      return { consentGranted: false, hasOtherClinicRecords, data: null };
    }

    const [appointments, prescriptionRecords, reports] = await Promise.all([
      this.patientPortalService.getAppointments(link.patientAccountId),
      this.patientPortalService.getPrescriptions(link.patientAccountId),
      this.patientPortalService.getReports(link.patientAccountId),
    ]);

    // getPrescriptions() returns ClinicalRecord rows (each with a nested
    // .prescriptions array) — flatten to individual prescription lines and
    // tag each with its source clinic, same shape the doctor UI expects.
    const recordClinicIds = [...new Set((prescriptionRecords.data || []).map((r: any) => r.clinicId).filter(Boolean))];
    const recordClinics = recordClinicIds.length
      ? await this.clinicRepo.find({ where: { id: In(recordClinicIds) } })
      : [];
    const clinicNameById = new Map(recordClinics.map(c => [c.id, c.name]));

    const prescriptions = (prescriptionRecords.data || []).flatMap((r: any) =>
      (r.prescriptions || []).map((rx: any) => ({
        ...rx,
        clinicName: clinicNameById.get(r.clinicId) || 'Unknown Clinic',
        prescribedAt: r.createdAt,
      })),
    );

    // Same for appointments — tag with clinic name for display.
    const apptClinicIds = [...new Set((appointments.data || []).map((a: any) => a.clinicId).filter(Boolean))];
    const apptClinics = apptClinicIds.length
      ? await this.clinicRepo.find({ where: { id: In(apptClinicIds) } })
      : [];
    const apptClinicNameById = new Map(apptClinics.map(c => [c.id, c.name]));
    const taggedAppointments = (appointments.data || []).map((a: any) => ({
      ...a,
      clinicName: apptClinicNameById.get(a.clinicId) || 'Unknown Clinic',
    }));

    return {
      consentGranted: true,
      hasOtherClinicRecords: true,
      data: { appointments: taggedAppointments, prescriptions, reports: reports.data },
    };
  }

  /**
   * POST /doctor/patients/:patientId/request-history-access
   * Sends the patient a consent-request notification (SMS/email) — never
   * grants access itself. Only the patient can flip the consent toggle.
   */
  async requestHistoryAccess(doctorId: string, clinicPatientId: string) {
    const { clinicId, link } = await this.resolveDoctorAndAccount(doctorId, clinicPatientId);
    if (!link) {
      throw new BadRequestException('This patient has no linked portal account to request access from.');
    }

    const [doctor, clinic, account] = await Promise.all([
      this.userRepo.findOne({ where: { id: doctorId } }),
      this.clinicRepo.findOne({ where: { id: clinicId } }),
      this.accountRepo.findOne({ where: { id: link.patientAccountId } }),
    ]);
    if (!account) throw new NotFoundException('Patient account not found');

    const doctorName = doctor ? `Dr. ${doctor.firstName} ${doctor.lastName}` : 'Your doctor';
    const clinicName = clinic?.name || 'the clinic';

    await this.notificationsService.sendPatientNotification({
      eventType: 'historyAccessRequest',
      to: { phone: account.phone, email: account.email },
      subject: `${clinicName} is requesting access to your full health history`,
      body: `ClinicKarobar: ${doctorName} at ${clinicName} would like to view your full cross-clinic health history. You can grant or deny this anytime in your patient portal under Consents.`,
    });

    return { message: 'A request has been sent to the patient to share their full history.' };
  }

  // ── Inter-Clinic Referrals ──────────────────────────────────────────────────

  async createReferral(doctorId: string, dto: {
    patientId: string;
    targetClinicId?: string;
    targetClinicSlug?: string;
    reason: string;
    attachedRecordIds?: string[];
    attachedFileIds?: string[];
  }) {
    const { clinicId, link } = await this.resolveDoctorAndAccount(doctorId, dto.patientId);
    if (!dto.targetClinicId && !dto.targetClinicSlug) {
      throw new BadRequestException('Specify a target clinic (id or slug).');
    }

    let targetClinicId = dto.targetClinicId || null;
    if (!targetClinicId && dto.targetClinicSlug) {
      const target = await this.clinicRepo.findOne({ where: { slug: dto.targetClinicSlug } as any });
      targetClinicId = target?.id || null;
    }

    // Referrals always carry their explicitly attached records, regardless
    // of the broader cross-clinic consent toggle — the patient is being
    // referred on purpose, so the referring doctor's selection stands.
    const referral = await this.referralRepo.save(this.referralRepo.create({
      referringClinicId: clinicId,
      referringDoctorId: doctorId,
      patientId: dto.patientId,
      patientAccountId: link?.patientAccountId || null,
      targetClinicId,
      targetClinicSlug: dto.targetClinicSlug || null,
      reason: dto.reason,
      attachedRecordIds: dto.attachedRecordIds || [],
      attachedFileIds: dto.attachedFileIds || [],
      status: ReferralStatus.PENDING,
    }));

    // Notify any doctors at the target clinic (in-app), and the patient (SMS/email).
    if (targetClinicId) {
      const targetDoctors = await this.userRepo.find({ where: { clinicId: targetClinicId } });
      for (const d of targetDoctors) {
        const notif = await this.notificationsService.create({
          userId: d.id,
          clinicId: targetClinicId,
          type: NotificationType.REFERRAL_RECEIVED,
          title: 'New Patient Referral',
          body: `A patient has been referred to your clinic. Reason: ${dto.reason}`,
          link: '/doctor/referrals',
          entityId: referral.id,
        } as any);
        this.notificationsGateway.emitToUser(d.id, 'notification', notif);
      }
    }

    if (link?.patientAccountId) {
      const account = await this.accountRepo.findOne({ where: { id: link.patientAccountId } });
      if (account) {
        const clinic = targetClinicId ? await this.clinicRepo.findOne({ where: { id: targetClinicId } }) : null;
        await this.notificationsService.sendPatientNotification({
          eventType: 'referralCreated',
          to: { phone: account.phone, email: account.email },
          subject: `You've been referred to ${clinic?.name || 'another clinic'}`,
          body: `ClinicKarobar: Your doctor has referred you to ${clinic?.name || 'another clinic'}. Check your patient portal for details.`,
        }).catch(() => {});
      }
    }

    return referral;
  }

  async getReferrals(doctorId: string, direction: 'incoming' | 'outgoing' = 'outgoing') {
    const doctor = await this.userRepo.findOne({ where: { id: doctorId } });
    if (!doctor) throw new NotFoundException('Doctor not found');

    const where = direction === 'incoming'
      ? { targetClinicId: doctor.clinicId }
      : { referringClinicId: doctor.clinicId };

    const data = await this.referralRepo.find({ where, order: { createdAt: 'DESC' } });

    // Tag with patient + clinic names for display.
    const patientIds = [...new Set(data.map(r => r.patientId))];
    const clinicIds = [...new Set(data.flatMap(r => [r.referringClinicId, r.targetClinicId]).filter(Boolean))] as string[];
    const [patients, clinics]: [Patient[], Clinic[]] = await Promise.all([
      patientIds.length ? this.patientRepo.find({ where: { id: In(patientIds) } }) : Promise.resolve([]),
      clinicIds.length ? this.clinicRepo.find({ where: { id: In(clinicIds) } }) : Promise.resolve([]),
    ]);
    const patientMap = new Map<string, Patient>(patients.map(p => [p.id, p]));
    const clinicMap = new Map<string, string>(clinics.map(c => [c.id, c.name]));

    return {
      data: data.map(r => ({
        ...r,
        patientName: patientMap.has(r.patientId)
          ? `${patientMap.get(r.patientId)!.firstName} ${patientMap.get(r.patientId)!.lastName}`
          : 'Unknown Patient',
        referringClinicName: clinicMap.get(r.referringClinicId) || 'Unknown Clinic',
        targetClinicName: r.targetClinicId ? (clinicMap.get(r.targetClinicId) || 'Unknown Clinic') : r.targetClinicSlug,
      })),
      total: data.length,
    };
  }

  async updateReferralStatus(doctorId: string, referralId: string, status: ReferralStatus) {
    const doctor = await this.userRepo.findOne({ where: { id: doctorId } });
    if (!doctor) throw new NotFoundException('Doctor not found');

    const referral = await this.referralRepo.findOne({ where: { id: referralId } });
    if (!referral) throw new NotFoundException('Referral not found');
    if (referral.targetClinicId !== doctor.clinicId) {
      throw new ForbiddenException('Only the receiving clinic can update this referral.');
    }

    referral.status = status;
    if (status === ReferralStatus.ACCEPTED) referral.acceptedByDoctorId = doctorId;
    return this.referralRepo.save(referral);
  }

  // ── Refill Request Inbox ────────────────────────────────────────────────────

  async getRefillRequests(doctorId: string) {
    const doctor = await this.userRepo.findOne({ where: { id: doctorId } });
    if (!doctor) throw new NotFoundException('Doctor not found');

    const data = await this.refillRequestRepo.find({
      where: { clinicId: doctor.clinicId, status: RefillRequestStatus.PENDING },
      order: { createdAt: 'DESC' },
    });

    const patientIds = [...new Set(data.map(r => r.clinicPatientId))];
    const patients = patientIds.length ? await this.patientRepo.find({ where: { id: In(patientIds) } }) : [];
    const patientMap = new Map(patients.map(p => [p.id, p]));

    return {
      data: data.map(r => ({
        ...r,
        patientName: patientMap.has(r.clinicPatientId)
          ? `${patientMap.get(r.clinicPatientId)!.firstName} ${patientMap.get(r.clinicPatientId)!.lastName}`
          : 'Unknown Patient',
      })),
      total: data.length,
    };
  }

  async approveRefillRequest(doctorId: string, refillRequestId: string) {
    const doctor = await this.userRepo.findOne({ where: { id: doctorId } });
    if (!doctor) throw new NotFoundException('Doctor not found');

    const refill = await this.refillRequestRepo.findOne({ where: { id: refillRequestId } });
    if (!refill) throw new NotFoundException('Refill request not found');
    if (refill.clinicId !== doctor.clinicId) throw new ForbiddenException();
    if (refill.status !== RefillRequestStatus.PENDING) {
      throw new BadRequestException('This refill request has already been resolved.');
    }

    // Reuse the clinical-record/prescription data model rather than a
    // separate "prescription" write path — a refill is just a new
    // ClinicalRecord carrying one Prescription line.
    const newRecord = await this.recordRepo.save(this.recordRepo.create({
      clinicId: doctor.clinicId,
      patientId: refill.clinicPatientId,
      doctorId,
      diagnosisNotes: `Prescription refill (requested by patient)`,
      prescriptions: [{
        medicineName: refill.medicineName,
        dosage: refill.dosage,
        frequency: refill.frequency,
        duration: refill.duration,
        instructions: refill.instructions,
      } as any],
    }) as any) as ClinicalRecord;

    refill.status = RefillRequestStatus.APPROVED;
    refill.resolvedByDoctorId = doctorId;
    refill.newRecordId = newRecord.id;
    refill.resolvedAt = new Date();
    await this.refillRequestRepo.save(refill);

    const account = await this.accountRepo.findOne({ where: { id: refill.patientAccountId } });
    if (account) {
      await this.notificationsService.sendPatientNotification({
        eventType: 'refillApproved',
        to: { phone: account.phone, email: account.email },
        subject: 'Your prescription refill has been approved',
        body: `ClinicKarobar: Your refill request for ${refill.medicineName} has been approved. Check your patient portal for the new prescription.`,
      }).catch(() => {});
    }

    return { message: 'Refill approved.', record: newRecord };
  }

  async denyRefillRequest(doctorId: string, refillRequestId: string, reason?: string) {
    const doctor = await this.userRepo.findOne({ where: { id: doctorId } });
    if (!doctor) throw new NotFoundException('Doctor not found');

    const refill = await this.refillRequestRepo.findOne({ where: { id: refillRequestId } });
    if (!refill) throw new NotFoundException('Refill request not found');
    if (refill.clinicId !== doctor.clinicId) throw new ForbiddenException();
    if (refill.status !== RefillRequestStatus.PENDING) {
      throw new BadRequestException('This refill request has already been resolved.');
    }

    refill.status = RefillRequestStatus.DENIED;
    refill.resolvedByDoctorId = doctorId;
    refill.denialReason = reason || null;
    refill.resolvedAt = new Date();
    return this.refillRequestRepo.save(refill);
  }
}