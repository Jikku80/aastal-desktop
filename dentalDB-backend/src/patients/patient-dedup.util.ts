import { Repository } from 'typeorm';
import { Patient } from './entities/patient.entity';
import { ilike, withAdvisoryLock } from '../database/sql-helpers';

/**
 * Strips a phone number down to bare digits and drops a leading country
 * code (977) or trunk zero, so "+9779812345678", "9779812345678",
 * "09812345678" and "9812345678" all compare equal.
 */
export function digitsOnly(phone?: string | null): string {
  if (!phone) return '';
  let digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('977') && digits.length > 10) digits = digits.slice(3);
  else if (digits.startsWith('0') && digits.length === 11) digits = digits.slice(1);
  return digits;
}

export interface PatientMatchInput {
  clinicId: string;
  opdNo?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
}

/**
 * Looks for an existing patient in this clinic that's really the same
 * person as `input`, using two independent signals — either one is enough:
 *
 *  1. Same OPD number (case-insensitive) — the OPD number is meant to be a
 *     stable per-patient identifier, so a match here is authoritative.
 *  2. Same first name + last name + phone number, all case-insensitive
 *     (phone compared as normalized digits so formatting differences don't
 *     matter).
 *
 * Returns null when nothing was supplied to match on, or nothing matched.
 */
export async function findMatchingPatient(
  repo: Repository<Patient>,
  input: PatientMatchInput,
): Promise<Patient | null> {
  const { clinicId } = input;
  const opdNo        = input.opdNo?.trim();
  const firstName     = input.firstName?.trim();
  const lastName       = input.lastName?.trim();
  const phoneDigits     = digitsOnly(input.phone);

  if (opdNo) {
    const byOpd = await repo
      .createQueryBuilder('p')
      .where('p.clinicId = :clinicId', { clinicId })
      .andWhere(`p.opdNo ${ilike()} :opdNo`, { opdNo })
      .getOne();
    if (byOpd) return byOpd;
  }

  if (firstName && lastName && phoneDigits) {
    const candidates = await repo
      .createQueryBuilder('p')
      .where('p.clinicId = :clinicId', { clinicId })
      .andWhere(`p.firstName ${ilike()} :fn`, { fn: firstName })
      .andWhere(`p.lastName ${ilike()} :ln`, { ln: lastName })
      .andWhere('p.phone IS NOT NULL')
      .getMany();
    const match = candidates.find(c => digitsOnly(c.phone) === phoneDigits);
    if (match) return match;
  }

  return null;
}

/**
 * Generates the next clinic-unique OPD number, formatted "OPD-00001",
 * "OPD-00002", etc. Locked the same way invoice numbers are (advisory lock
 * held for the whole read-then-write, inside a transaction) so two
 * concurrent walk-ins/bookings can never be handed the same number.
 *
 * Legacy/free-text OPD numbers that don't match the "OPD-" prefix are
 * simply ignored when computing the next sequence — they stay exactly as a
 * staff member typed them, and remain editable at any time from the
 * patient record.
 */
export async function generateUniqueOpdNo(repo: Repository<Patient>, clinicId: string): Promise<string> {
  return repo.manager.transaction(async (manager) => {
    const lockKey = Buffer.from(clinicId).reduce((a, b) => a + b, 0) % 2147483647;
    await withAdvisoryLock(manager, lockKey);

    const prefix = 'OPD-';
    const last = await manager
      .createQueryBuilder(Patient, 'p')
      .select('p.opdNo', 'opdNo')
      .where('p.clinicId = :clinicId', { clinicId })
      .andWhere('p.opdNo LIKE :prefix', { prefix: prefix + '%' })
      .orderBy('p.opdNo', 'DESC')
      .limit(1)
      .getRawOne();

    let nextSeq = 1;
    if (last?.opdNo) {
      const tail   = String(last.opdNo).slice(prefix.length);
      const parsed = parseInt(tail, 10);
      if (!Number.isNaN(parsed)) nextSeq = parsed + 1;
    }
    return prefix + String(nextSeq).padStart(5, '0');
  });
}

/**
 * The one place "create or reuse a patient" should happen. Looks for a
 * match via `findMatchingPatient`; if found, quietly backfills any fields
 * that were blank on the existing record (never overwrites data that's
 * already there) and returns it. Otherwise creates a new patient, assigning
 * an auto-generated OPD number when none was supplied — still editable
 * later from the patient's record.
 */
export async function findOrCreatePatient(
  repo: Repository<Patient>,
  clinicId: string,
  data: Partial<Patient> & { firstName: string },
): Promise<{ patient: Patient; created: boolean }> {
  const existing = await findMatchingPatient(repo, {
    clinicId,
    opdNo:     data.opdNo as string,
    firstName: data.firstName,
    lastName:  data.lastName,
    phone:     data.phone as string,
  });

  if (existing) {
    // Non-destructive merge: fill in gaps on the existing record from
    // whatever new details were just submitted, but never clobber a field
    // that's already populated.
    const fillable: (keyof Patient)[] = [
      'opdNo', 'email', 'gender', 'branchId', 'dateOfBirth', 'address',
      'bloodGroup', 'emergencyContactName', 'emergencyContactPhone',
    ];
    let changed = false;
    for (const key of fillable) {
      const incoming = (data as any)[key];
      if (incoming !== undefined && incoming !== null && incoming !== '' && !(existing as any)[key]) {
        (existing as any)[key] = incoming;
        changed = true;
      }
    }
    if (changed) await repo.save(existing);
    return { patient: existing, created: false };
  }

  const opdNo = (data.opdNo && String(data.opdNo).trim()) || await generateUniqueOpdNo(repo, clinicId);
  const entityLike = { ...data, clinicId, opdNo } as any;
  const toSave = repo.create(entityLike);
  const saved  = await repo.save(toSave) as unknown as Patient;
  return { patient: saved, created: true };
}

/** Counts non-empty scalar fields on a patient — used to break merge ties. */
export function countFilledFields(p: Patient): number {
  const keys: (keyof Patient)[] = [
    'opdNo', 'email', 'phone', 'dateOfBirth', 'ageYears', 'gender', 'bloodGroup',
    'address', 'emergencyContactName', 'emergencyContactPhone', 'insuranceProvider',
    'insurancePolicyNumber', 'notes', 'avatar', 'branchId',
  ];
  let count = 0;
  for (const k of keys) if ((p as any)[k]) count++;
  if (p.allergies?.length) count++;
  if (p.medicalConditions?.length) count++;
  if (p.currentMedications?.length) count++;
  return count;
}
