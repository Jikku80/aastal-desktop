import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ilike } from '../database/sql-helpers';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { Patient } from './entities/patient.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { ClinicalRecord } from '../clinical-records/entities/clinical-record.entity';
import { PatientFile } from '../files/entities/patient-file.entity';
import { BloodTest } from '../blood-test/entities/blood-test.entity';
import { Invoice } from '../billing/entities/invoice.entity';
import { PatientAccountLink } from '../patient-auth/entities/patient-account-link.entity';

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(Patient) private repo: Repository<Patient>,
    @InjectRepository(Appointment) private appointmentRepo: Repository<Appointment>,
    @InjectRepository(ClinicalRecord) private clinicalRecordRepo: Repository<ClinicalRecord>,
    @InjectRepository(PatientFile) private fileRepo: Repository<PatientFile>,
    @InjectRepository(BloodTest) private bloodTestRepo: Repository<BloodTest>,
    @InjectRepository(Invoice) private invoiceRepo: Repository<Invoice>,
    @InjectRepository(PatientAccountLink) private accountLinkRepo: Repository<PatientAccountLink>,
  ) {}

  /** Attach computed age to a patient object */
  private attachAge<T extends { ageYears?: number; dateOfBirth?: Date; age?: number }>(p: T): T & { age: number | null } {
    if (p.ageYears != null) return { ...p, age: p.ageYears };
    if (!p.dateOfBirth) return { ...p, age: null };
    const today = new Date();
    const dob   = new Date(p.dateOfBirth);
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    return { ...p, age };
  }

  private attachAgeToList(patients: any[]): any[] {
    return patients.map(p => this.attachAge(p));
  }

  /**
   * Normalize and validate a Nepal phone number (#9): accepts a bare 10-digit
   * number or one already prefixed with +977/977/0, and always returns it
   * stored as "+977XXXXXXXXXX". Throws if the result isn't exactly 10 digits
   * after stripping any prefix — this is the server-side backstop for the
   * same rule the patient form enforces client-side.
   */
  private normalizeNepalPhone(raw: string | null | undefined, fieldLabel = 'Phone number'): string | null {
    if (raw === null || raw === undefined || raw === '') return null;
    let digits = String(raw).replace(/\D/g, '');
    if (digits.startsWith('977') && digits.length > 10) digits = digits.slice(3);
    else if (digits.startsWith('0') && digits.length === 11) digits = digits.slice(1);
    if (!/^\d{10}$/.test(digits)) {
      throw new BadRequestException(`${fieldLabel} must be exactly 10 digits (got "${raw}").`);
    }
    return `+977${digits}`;
  }

  async create(clinicId: string, dto: Partial<Patient> & { createdAt?: string | Date }): Promise<Patient> {
    const { createdAt, ...rest } = dto as any;
    if (rest.phone) rest.phone = this.normalizeNepalPhone(rest.phone);

    // Explicitly typed as DeepPartial<Patient> (not an array) so TypeORM's
    // `create()` resolves to the single-entity overload instead of the
    // array overload — otherwise `patient`/`saved` get inferred as Patient[]
    // and `.id` / `.createdAt` access below fails to type-check.
    const entityLike: DeepPartial<Patient> = { ...rest, clinicId };
    const patient: Patient = this.repo.create(entityLike);
    const saved: Patient = await this.repo.save(patient);

    // If a custom createdAt was supplied (e.g. backfilling old records), apply it
    // directly via a raw UPDATE — TypeORM's @CreateDateColumn cannot be overridden
    // through save() because it is set unconditionally on INSERT.
    if (createdAt) {
      const date = new Date(createdAt);
      if (!isNaN(date.getTime())) {
        await this.repo.update({ id: saved.id }, { createdAt: date } as any);
        saved.createdAt = date;
      }
    }
    return saved;
  }

  async findAll(clinicId: string, query: any) {
    const { page = 1, limit = 20, search, branchId, branchIds } = query;

    let qb = this.repo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.branch', 'branch')
      .where('p.clinicId = :clinicId', { clinicId });

    if (branchId) {
      qb = qb.andWhere('p.branchId = :branchId', { branchId });
    } else if (branchIds) {
      const ids = String(branchIds).split(',').map(s => s.trim()).filter(Boolean);
      if (ids.length > 0) qb = qb.andWhere('p.branchId IN (:...ids)', { ids });
    }

    if (search) {
      qb = qb.andWhere(
        `(p.firstName ${ilike()} :s OR p.lastName ${ilike()} :s OR p.email ${ilike()} :s OR p.phone ${ilike()} :s OR p.opdNo ${ilike()} :s)`,
        { s: `%${search}%` },
      );
    }

    qb = qb.orderBy('p.createdAt', 'DESC');

    const total = await qb.getCount();
    const data  = await qb.skip((page - 1) * limit).take(+limit).getMany();

    return { data: this.attachAgeToList(data), total, page: +page, limit: +limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(clinicId: string, id: string): Promise<Patient> {
    const patient = await this.repo.findOne({
      where:     { id, clinicId },
      relations: ['branch'],
    });
    if (!patient) throw new NotFoundException('Patient not found');
    return this.attachAge(patient) as Patient;
  }

  async getHistory(clinicId: string, id: string) {
    await this.findOne(clinicId, id);

    // Fetch appointments and clinical records in parallel
    const [appointments, records] = await Promise.all([
      this.appointmentRepo.find({
        where: { clinicId, patientId: id },
        order: { scheduledAt: 'DESC' },
        relations: ['dentist', 'branch'],
      }),
      this.clinicalRecordRepo.find({
        where: { clinicId, patientId: id },
        order: { createdAt: 'DESC' },
        relations: ['doctor', 'prescriptions'],
      }),
    ]);

    // Merge into a unified timeline sorted by date descending
    const appointmentItems = appointments.map(a => ({
      ...a,
      _type: 'appointment' as const,
      _date: new Date(a.scheduledAt),
    }));

    const recordItems = records.map(r => ({
      ...r,
      _type: 'clinical_record' as const,
      _date: new Date(r.createdAt),
    }));

    const merged = [...appointmentItems, ...recordItems].sort(
      (a, b) => b._date.getTime() - a._date.getTime(),
    );

    return merged;
  }

  async update(clinicId: string, id: string, dto: Partial<Patient> & { createdAt?: string | Date }): Promise<Patient> {
    await this.findOne(clinicId, id);
    const { createdAt, ...rest } = dto as any;
    if (rest.phone) rest.phone = this.normalizeNepalPhone(rest.phone);
    const updatePayload: any = { ...rest };
    if (createdAt) {
      const date = new Date(createdAt);
      if (!isNaN(date.getTime())) updatePayload.createdAt = date;
    }
    await this.repo.update({ id, clinicId }, updatePayload);
    return this.findOne(clinicId, id);
  }

  // Table name → plain-English label, used only to build the error message
  // below. Not exhaustive of every table that references patients (new
  // clinical modules can add their own FK later) — this just makes the
  // common cases read clearly; anything not listed still gets a sensible
  // fallback rather than a raw table name.
  private static readonly PATIENT_FK_TABLE_LABELS: Record<string, string> = {
    appointments:            'appointments',
    invoices:                'invoices',
    clinical_records:        'clinical records',
    blood_tests:             'blood test records',
    lab_work:                'lab work records',
    dental_charts:           'a dental chart',
    recalls:                 'recall schedules',
    vitals:                  'vitals records',
    waiting_queue:           'a waiting-queue entry',
    patient_files:           'uploaded files',
    patient_account_links:   'a linked patient-portal account',
    reviews:                 'a review',
  };

  async remove(clinicId: string, id: string): Promise<void> {
    await this.findOne(clinicId, id);
    try {
      await this.repo.delete({ id, clinicId });
    } catch (e: any) {
      // Postgres foreign_key_violation. A patient with any clinical or
      // billing history (appointments, invoices, clinical records, etc.)
      // is intentionally NOT hard-deletable — cascading that away would
      // silently destroy medical/financial records. Previously this just
      // bubbled up as an unhandled QueryFailedError (a raw 500), which is
      // what showed up in the logs. Turn it into a clear, actionable error
      // instead, and point at the existing archive/deactivate path.
      if (e?.code === '23503') {
        const table = e?.table as string | undefined;
        const label = (table && PatientsService.PATIENT_FK_TABLE_LABELS[table]) || 'other records';
        throw new BadRequestException(
          `This patient can't be deleted because they still have ${label} on file. ` +
          `To remove them from active lists while keeping their history intact, mark them inactive instead ` +
          `(PATCH this patient with { "isActive": false }). If you specifically need to erase this patient's ` +
          `data, delete or reassign their ${label} first.`
        );
      }
      throw e;
    }
  }

  // ── Duplicate Patient Merge ─────────────────────────────────────────────────

  /**
   * Reassigns every clinical-record, file, blood-test, appointment, and
   * invoice from `mergeId` to `keepId`, then deletes the now-empty
   * duplicate. Both patients must belong to `clinicId` — this never
   * crosses clinics, since the whole point is fixing an accidental
   * duplicate created by this clinic's own staff.
   */
  async merge(clinicId: string, keepId: string, mergeId: string): Promise<{ message: string; keepId: string }> {
    if (keepId === mergeId) {
      throw new BadRequestException('Cannot merge a patient into itself.');
    }

    const [keep, dupe] = await Promise.all([
      this.repo.findOne({ where: { id: keepId, clinicId } }),
      this.repo.findOne({ where: { id: mergeId, clinicId } }),
    ]);
    if (!keep) throw new NotFoundException('The patient record to keep was not found in this clinic.');
    if (!dupe) throw new NotFoundException('The duplicate patient record was not found in this clinic.');

    await Promise.all([
      this.clinicalRecordRepo.update({ patientId: mergeId, clinicId }, { patientId: keepId } as any),
      this.fileRepo.update({ patientId: mergeId, clinicId }, { patientId: keepId } as any),
      this.bloodTestRepo.update({ patientId: mergeId, clinicId }, { patientId: keepId } as any),
      this.appointmentRepo.update({ patientId: mergeId, clinicId }, { patientId: keepId } as any),
      this.invoiceRepo.update({ patientId: mergeId, clinicId }, { patientId: keepId } as any),
    ]);

    // Reassign any PatientAccountLink rows pointing at the duplicate so a
    // patient-portal account doesn't lose its connection to this clinic's
    // records. If the account is already linked to `keepId` too (e.g. it
    // auto-matched both rows independently), drop the duplicate link
    // instead of violating the (patientAccountId, clinicPatientId) unique index.
    const dupeLinks = await this.accountLinkRepo.find({ where: { clinicPatientId: mergeId } });
    for (const dupeLink of dupeLinks) {
      const existing = await this.accountLinkRepo.findOne({
        where: { patientAccountId: dupeLink.patientAccountId, clinicPatientId: keepId },
      });
      if (existing) {
        await this.accountLinkRepo.delete(dupeLink.id);
      } else {
        await this.accountLinkRepo.update(dupeLink.id, { clinicPatientId: keepId });
      }
    }

    await this.repo.delete({ id: mergeId, clinicId });

    return { message: `Merged ${dupe.firstName} ${dupe.lastName} into ${keep.firstName} ${keep.lastName}.`, keepId };
  }
}