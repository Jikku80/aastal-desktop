// AUTO-DRAFTED registry of offline-capable entities for the generic sync engine.
// Each entry: { name, entity, timestampField } — timestampField is 'createdAt' for
// append-only/immutable records (vitals readings, audit log, wallet transactions,
// consent/intake submissions, role assignments, file uploads) where there is no
// meaningful 'updatedAt' and creation time is the correct conflict-resolution clock.
// NOTE: hand-review recommended before relying on this in production — generated
// mechanically from the entity file list, not manually vetted per-entity.

import { Patient } from '../patients/entities/patient.entity';
import { Vitals } from '../appointments/entities/vitals.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { ClinicalRecord, Prescription } from '../clinical-records/entities/clinical-record.entity';
import { DentalChart } from '../dental-chart/entities/dental-chart.entity';
import { BloodTest } from '../blood-test/entities/blood-test.entity';
import { LabWork } from '../lab-work/entities/lab-work.entity';
import { PrescriptionTemplate } from '../prescription/entities/prescription-template.entity';
import { Invoice } from '../billing/entities/invoice.entity';
import { PayrollDeductionRule } from '../payroll/entities/payroll-deduction-rule.entity';
import { PayrollEntry } from '../payroll/entities/payroll-entry.entity';
import { PayrollRun } from '../payroll/entities/payroll-run.entity';
import { DoctorCommission } from '../commissions/entities/commission.entity';
import { Vendor } from '../expenses/entities/vendor.entity';
import { Expense } from '../expenses/entities/expense.entity';
import { Product } from '../inventory/entities/product.entity';
import { PurchaseOrder } from '../inventory/entities/purchase-order.entity';
import { Attendance } from '../attendance/entities/attendance.entity';
import { Shift } from '../shifts/entities/shift.entity';
import { ShiftAssignment } from '../shifts/entities/shift-assignment.entity';
import { ShiftPattern } from '../shifts/entities/shift-pattern.entity';
import { Leave } from '../leave/entities/leave.entity';
import { Holiday } from '../holidays/entities/holiday.entity';
import { Task } from '../tasks/entities/task.entity';
import { ConsentTemplate } from '../consents/entities/consent-template.entity';
import { ConsentSubmission } from '../consents/entities/consent-submission.entity';
import { IntakeFormTemplate } from '../intake-forms/entities/intake-form-template.entity';
import { IntakeFormSubmission } from '../intake-forms/entities/intake-form-submission.entity';
import { WaitingQueue } from '../waiting-queue/entities/waiting-queue.entity';
import { WalletTransaction } from '../patient-wallet/entities/wallet-transaction.entity';
import { PatientWallet } from '../patient-wallet/entities/patient-wallet.entity';
import { ClinicService } from '../services/entities/service.entity';
import { DowngradeSelection } from '../branch/entities/downgrade-selection.entity';
import { Branch } from '../branch/entities/branch.entity';
import { Clinic } from '../clinics/entities/clinic.entity';
import { Role } from '../rbac/entities/role.entity';
import { Permission } from '../rbac/entities/permission.entity';
import { UserRole } from '../rbac/entities/user-role.entity';
import { User } from '../users/entities/user.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { ApiKey } from '../api-keys/entities/api-key.entity';
import { IndependentAvailability } from '../doctor-profile/entities/independent-availability.entity';
import { DoctorProfile } from '../doctor-profile/entities/doctor-profile.entity';
import { DoctorLocation } from '../doctor-profile/entities/doctor-location.entity';
import { DoctorClinicAffiliation } from '../doctor-affiliation/entities/doctor-clinic-affiliation.entity';
import { PatientFile } from '../files/entities/patient-file.entity';
import { Notice } from '../notices/entities/notice.entity';

export interface SyncRegistryEntry {
  name: string;
  entity: Function;
  timestampField: 'updatedAt' | 'createdAt';
  /** How to scope this entity's rows to one clinicId — see ClinicScope below. */
  clinicScope: ClinicScope;
}

/**
 * Added alongside SyncDeviceGuard so the guard's per-clinic token can
 * actually be enforced at the query level, not just at the door. Every
 * SYNC_REGISTRY entity needs one of these so generateChangesSince /
 * applyIncoming know how to filter to `req.syncClinicId` — see
 * SyncService's scopedFindWhere / scopedIdsForClinic.
 *
 *  - direct(field?)  — entity has its own clinicId-like column (default 'clinicId').
 *  - self            — the entity's own id IS the clinicId (only Clinic).
 *  - via(entity, localField, clinicField?) — no clinicId column on this
 *    entity itself; scope indirectly by joining localField to another
 *    registered entity's clinic column (e.g. UserRole.userId -> User.clinicId).
 *  - global          — genuinely not clinic-owned data (system-wide config,
 *    or a cross-clinic entity like an independent doctor's profile) —
 *    intentionally NOT filtered. Flagged per-entry below with why.
 */
export type ClinicScope =
  | { type: 'direct'; field?: string }
  | { type: 'self' }
  | { type: 'via'; viaEntity: Function; localField: string; viaClinicField?: string }
  | { type: 'global' };

const direct: ClinicScope = { type: 'direct' };

export const SYNC_REGISTRY: SyncRegistryEntry[] = [
  { name: 'Patient', entity: Patient, timestampField: 'updatedAt', clinicScope: direct },
  { name: 'Vitals', entity: Vitals, timestampField: 'createdAt', clinicScope: direct },
  { name: 'Appointment', entity: Appointment, timestampField: 'updatedAt', clinicScope: direct },
  { name: 'ClinicalRecord', entity: ClinicalRecord, timestampField: 'updatedAt', clinicScope: direct },
  // No clinicId column — scope indirectly via the clinical record it belongs to.
  { name: 'Prescription', entity: Prescription, timestampField: 'updatedAt', clinicScope: { type: 'via', viaEntity: ClinicalRecord, localField: 'clinicalRecordId' } },
  { name: 'DentalChart', entity: DentalChart, timestampField: 'updatedAt', clinicScope: direct },
  { name: 'BloodTest', entity: BloodTest, timestampField: 'updatedAt', clinicScope: direct },
  { name: 'LabWork', entity: LabWork, timestampField: 'updatedAt', clinicScope: direct },
  { name: 'PrescriptionTemplate', entity: PrescriptionTemplate, timestampField: 'updatedAt', clinicScope: direct },
  { name: 'Invoice', entity: Invoice, timestampField: 'updatedAt', clinicScope: direct },
  { name: 'PayrollDeductionRule', entity: PayrollDeductionRule, timestampField: 'updatedAt', clinicScope: direct },
  { name: 'PayrollEntry', entity: PayrollEntry, timestampField: 'updatedAt', clinicScope: direct },
  { name: 'PayrollRun', entity: PayrollRun, timestampField: 'updatedAt', clinicScope: direct },
  { name: 'DoctorCommission', entity: DoctorCommission, timestampField: 'createdAt', clinicScope: direct },
  { name: 'Vendor', entity: Vendor, timestampField: 'updatedAt', clinicScope: direct },
  { name: 'Expense', entity: Expense, timestampField: 'updatedAt', clinicScope: direct },
  { name: 'Product', entity: Product, timestampField: 'updatedAt', clinicScope: direct },
  { name: 'PurchaseOrder', entity: PurchaseOrder, timestampField: 'updatedAt', clinicScope: direct },
  { name: 'Attendance', entity: Attendance, timestampField: 'updatedAt', clinicScope: direct },
  { name: 'Shift', entity: Shift, timestampField: 'updatedAt', clinicScope: direct },
  { name: 'ShiftAssignment', entity: ShiftAssignment, timestampField: 'updatedAt', clinicScope: direct },
  { name: 'ShiftPattern', entity: ShiftPattern, timestampField: 'updatedAt', clinicScope: direct },
  { name: 'Leave', entity: Leave, timestampField: 'updatedAt', clinicScope: direct },
  { name: 'Holiday', entity: Holiday, timestampField: 'updatedAt', clinicScope: direct },
  { name: 'Task', entity: Task, timestampField: 'updatedAt', clinicScope: direct },
  { name: 'ConsentTemplate', entity: ConsentTemplate, timestampField: 'updatedAt', clinicScope: direct },
  // No clinicId column — scope indirectly via the appointment it was signed against.
  { name: 'ConsentSubmission', entity: ConsentSubmission, timestampField: 'createdAt', clinicScope: { type: 'via', viaEntity: Appointment, localField: 'appointmentId' } },
  { name: 'IntakeFormTemplate', entity: IntakeFormTemplate, timestampField: 'updatedAt', clinicScope: direct },
  { name: 'IntakeFormSubmission', entity: IntakeFormSubmission, timestampField: 'createdAt', clinicScope: { type: 'via', viaEntity: Appointment, localField: 'appointmentId' } },
  { name: 'WaitingQueue', entity: WaitingQueue, timestampField: 'updatedAt', clinicScope: direct },
  { name: 'WalletTransaction', entity: WalletTransaction, timestampField: 'createdAt', clinicScope: direct },
  { name: 'PatientWallet', entity: PatientWallet, timestampField: 'updatedAt', clinicScope: direct },
  { name: 'ClinicService', entity: ClinicService, timestampField: 'updatedAt', clinicScope: direct },
  { name: 'DowngradeSelection', entity: DowngradeSelection, timestampField: 'updatedAt', clinicScope: direct },
  { name: 'Branch', entity: Branch, timestampField: 'updatedAt', clinicScope: direct },
  { name: 'Clinic', entity: Clinic, timestampField: 'updatedAt', clinicScope: { type: 'self' } },
  // clinicId is nullable on Role (system-wide default roles) — those rows
  // simply never match a clinic filter and won't sync out, which is
  // correct: every instance already seeds its own system roles locally.
  { name: 'Role', entity: Role, timestampField: 'updatedAt', clinicScope: direct },
  // Permission keys are genuinely global system config (not owned by any
  // clinic) — every instance needs the full set regardless of clinicId.
  { name: 'Permission', entity: Permission, timestampField: 'updatedAt', clinicScope: { type: 'global' } },
  // No clinicId column — scope indirectly via the user the role assignment belongs to.
  { name: 'UserRole', entity: UserRole, timestampField: 'createdAt', clinicScope: { type: 'via', viaEntity: User, localField: 'userId' } },
  { name: 'User', entity: User, timestampField: 'updatedAt', clinicScope: direct },
  { name: 'AuditLog', entity: AuditLog, timestampField: 'createdAt', clinicScope: direct },
  { name: 'ApiKey', entity: ApiKey, timestampField: 'updatedAt', clinicScope: direct },
  // Doctors can be independently affiliated with multiple clinics or none
  // (see doctor-affiliation module) — their profile/location/availability
  // rows are owned by the doctor, not any one clinic, so they're
  // deliberately global here. DoctorClinicAffiliation (below) is the
  // actual clinic-scoped join table and IS filtered.
  { name: 'IndependentAvailability', entity: IndependentAvailability, timestampField: 'updatedAt', clinicScope: { type: 'global' } },
  { name: 'DoctorProfile', entity: DoctorProfile, timestampField: 'updatedAt', clinicScope: { type: 'global' } },
  { name: 'DoctorLocation', entity: DoctorLocation, timestampField: 'updatedAt', clinicScope: { type: 'global' } },
  { name: 'DoctorClinicAffiliation', entity: DoctorClinicAffiliation, timestampField: 'updatedAt', clinicScope: direct },
  { name: 'PatientFile', entity: PatientFile, timestampField: 'createdAt', clinicScope: direct },
  { name: 'Notice', entity: Notice, timestampField: 'updatedAt', clinicScope: direct },
];