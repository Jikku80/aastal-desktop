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
  /**
   * Column(s) with a DB-level UNIQUE constraint that aren't the primary
   * key. Declaring these lets SyncService.applyIncoming recognize "this
   * incoming row's id doesn't exist locally, but its unique field already
   * belongs to a different local row" (e.g. a locally-seeded placeholder
   * Clinic and its later hosted-backend counterpart ending up with two
   * different ids for the same logical clinic) and reconcile it as an
   * update instead of attempting an INSERT that would throw a UNIQUE
   * constraint violation and abort the whole sync transaction.
   */
  uniqueFields?: string[];
  /**
   * Other scalar FK columns on this entity that reference another
   * SYNC_REGISTRY entity's id, distinct from the clinicScope relationship
   * (e.g. Task.assignedToUserId -> User, Appointment.dentistId -> User).
   * Needed because when the referenced entity's id gets remapped via
   * uniqueFields reconciliation (see uniqueFields above — currently
   * User.email, Permission.key, Clinic.slug), any OTHER entity's row in
   * the SAME pull that still points at the old id throws "FOREIGN KEY
   * constraint failed" at commit unless it's rewritten first. The
   * clinicScope's own field (clinicId for 'direct', localField for
   * 'via') is already remapped separately in pullChanges and does not
   * need to be repeated here.
   *
   * NOTE: this list is currently scoped to columns referencing User,
   * since User is the only registry entity (besides Clinic and
   * Permission, both already covered elsewhere) that both (a) declares
   * uniqueFields and (b) is pointed at by scalar FK columns on other
   * entities. If a future entity gains uniqueFields, audit for any
   * other entity holding a raw FK to it and add it here too.
   */
  foreignKeys?: { field: string; refEntity: Function }[];
  /**
   * Same idea as foreignKeys, but for an eager-loaded many-to-many
   * relation embedded as a nested array of { id, ... } objects on the
   * row payload (e.g. Role.permissions via the role_permissions join
   * table), rather than a scalar FK column.
   */
  manyToManyFields?: { field: string; refEntity: Function }[];
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
  { name: 'Vitals', entity: Vitals, timestampField: 'createdAt', clinicScope: direct, foreignKeys: [{ field: 'recordedBy', refEntity: User }] },
  { name: 'Appointment', entity: Appointment, timestampField: 'updatedAt', clinicScope: direct, foreignKeys: [{ field: 'dentistId', refEntity: User }] },
  { name: 'ClinicalRecord', entity: ClinicalRecord, timestampField: 'updatedAt', clinicScope: direct, foreignKeys: [{ field: 'doctorId', refEntity: User }] },
  // No clinicId column — scope indirectly via the clinical record it belongs to.
  { name: 'Prescription', entity: Prescription, timestampField: 'updatedAt', clinicScope: { type: 'via', viaEntity: ClinicalRecord, localField: 'clinicalRecordId' } },
  { name: 'DentalChart', entity: DentalChart, timestampField: 'updatedAt', clinicScope: direct },
  { name: 'BloodTest', entity: BloodTest, timestampField: 'updatedAt', clinicScope: direct, foreignKeys: [{ field: 'orderedById', refEntity: User }] },
  { name: 'LabWork', entity: LabWork, timestampField: 'updatedAt', clinicScope: direct, foreignKeys: [{ field: 'orderedById', refEntity: User }] },
  { name: 'PrescriptionTemplate', entity: PrescriptionTemplate, timestampField: 'updatedAt', clinicScope: direct },
  { name: 'Invoice', entity: Invoice, timestampField: 'updatedAt', clinicScope: direct },
  { name: 'PayrollDeductionRule', entity: PayrollDeductionRule, timestampField: 'updatedAt', clinicScope: direct },
  { name: 'PayrollEntry', entity: PayrollEntry, timestampField: 'updatedAt', clinicScope: direct, foreignKeys: [{ field: 'userId', refEntity: User }] },
  { name: 'PayrollRun', entity: PayrollRun, timestampField: 'updatedAt', clinicScope: direct },
  { name: 'DoctorCommission', entity: DoctorCommission, timestampField: 'createdAt', clinicScope: direct, foreignKeys: [{ field: 'doctorId', refEntity: User }] },
  { name: 'Vendor', entity: Vendor, timestampField: 'updatedAt', clinicScope: direct },
  { name: 'Expense', entity: Expense, timestampField: 'updatedAt', clinicScope: direct },
  { name: 'Product', entity: Product, timestampField: 'updatedAt', clinicScope: direct },
  { name: 'PurchaseOrder', entity: PurchaseOrder, timestampField: 'updatedAt', clinicScope: direct },
  { name: 'Attendance', entity: Attendance, timestampField: 'updatedAt', clinicScope: direct, foreignKeys: [{ field: 'userId', refEntity: User }] },
  { name: 'Shift', entity: Shift, timestampField: 'updatedAt', clinicScope: direct },
  { name: 'ShiftAssignment', entity: ShiftAssignment, timestampField: 'updatedAt', clinicScope: direct, foreignKeys: [{ field: 'userId', refEntity: User }] },
  { name: 'ShiftPattern', entity: ShiftPattern, timestampField: 'updatedAt', clinicScope: direct, foreignKeys: [{ field: 'userId', refEntity: User }] },
  { name: 'Leave', entity: Leave, timestampField: 'updatedAt', clinicScope: direct, foreignKeys: [{ field: 'userId', refEntity: User }] },
  { name: 'Holiday', entity: Holiday, timestampField: 'updatedAt', clinicScope: direct },
  { name: 'Task', entity: Task, timestampField: 'updatedAt', clinicScope: direct, foreignKeys: [{ field: 'assignedToUserId', refEntity: User }, { field: 'createdByUserId', refEntity: User }] },
  { name: 'ConsentTemplate', entity: ConsentTemplate, timestampField: 'updatedAt', clinicScope: direct },
  // No clinicId column — scope indirectly via the appointment it was signed against.
  { name: 'ConsentSubmission', entity: ConsentSubmission, timestampField: 'createdAt', clinicScope: { type: 'via', viaEntity: Appointment, localField: 'appointmentId' } },
  { name: 'IntakeFormTemplate', entity: IntakeFormTemplate, timestampField: 'updatedAt', clinicScope: direct },
  { name: 'IntakeFormSubmission', entity: IntakeFormSubmission, timestampField: 'createdAt', clinicScope: { type: 'via', viaEntity: Appointment, localField: 'appointmentId' } },
  { name: 'WaitingQueue', entity: WaitingQueue, timestampField: 'updatedAt', clinicScope: direct, foreignKeys: [{ field: 'doctorId', refEntity: User }] },
  { name: 'WalletTransaction', entity: WalletTransaction, timestampField: 'createdAt', clinicScope: direct },
  { name: 'PatientWallet', entity: PatientWallet, timestampField: 'updatedAt', clinicScope: direct },
  { name: 'ClinicService', entity: ClinicService, timestampField: 'updatedAt', clinicScope: direct },
  { name: 'DowngradeSelection', entity: DowngradeSelection, timestampField: 'updatedAt', clinicScope: direct },
  { name: 'Branch', entity: Branch, timestampField: 'updatedAt', clinicScope: direct },
  { name: 'Clinic', entity: Clinic, timestampField: 'updatedAt', clinicScope: { type: 'self' }, uniqueFields: ['slug'] },
  // clinicId is nullable on Role (system-wide default roles) — those rows
  // simply never match a clinic filter and won't sync out, which is
  // correct: every instance already seeds its own system roles locally.
  { name: 'Role', entity: Role, timestampField: 'updatedAt', clinicScope: direct, foreignKeys: [{ field: 'doctorUserId', refEntity: User }], manyToManyFields: [{ field: 'permissions', refEntity: Permission }] },
  // Permission keys are genuinely global system config (not owned by any
  // clinic) — every instance needs the full set regardless of clinicId.
  // uniqueFields: ['key'] — every instance seeds its own copy of the same
  // global permission set locally (each with its own freshly-generated
  // id), so a pulled Permission row's id essentially never matches a
  // local row even though its key does. Without this, every single
  // Permission row hits "UNIQUE constraint failed: permissions.key" and
  // gets silently skipped via the safety-net catch in applyIncoming, on
  // every single sync, forever. Declaring the unique field lets it
  // reconcile onto the existing local row instead, the same way Clinic's
  // slug does.
  { name: 'Permission', entity: Permission, timestampField: 'updatedAt', clinicScope: { type: 'global' }, uniqueFields: ['key'] },
  // No clinicId column — scope indirectly via the user the role assignment belongs to.
  { name: 'UserRole', entity: UserRole, timestampField: 'createdAt', clinicScope: { type: 'via', viaEntity: User, localField: 'userId' } },
  // uniqueFields: ['email'] — users.email has a DB-level UNIQUE index
  // (see User entity). Without this, a pulled User row whose id doesn't
  // exist locally but whose email already belongs to a different local
  // row (e.g. the same staff member created independently on two
  // instances before they ever synced) hits "UNIQUE constraint failed:
  // users.email" on insert and gets silently skipped via the safety-net
  // catch in applyIncoming instead of being reconciled onto the existing
  // row. A skipped User then leaves a dangling reference for any row
  // applied later in the same transaction that points at its userId
  // (e.g. UserRole), which throws "FOREIGN KEY constraint failed" and
  // rolls back the entire pull. Declaring the unique field lets it
  // reconcile the same way Clinic.slug and Permission.key do.
  { name: 'User', entity: User, timestampField: 'updatedAt', clinicScope: direct, uniqueFields: ['email'] },
  { name: 'AuditLog', entity: AuditLog, timestampField: 'createdAt', clinicScope: direct, foreignKeys: [{ field: 'userId', refEntity: User }] },
  { name: 'ApiKey', entity: ApiKey, timestampField: 'updatedAt', clinicScope: direct },
  // Doctors can be independently affiliated with multiple clinics or none
  // (see doctor-affiliation module) — their profile/location/availability
  // rows are owned by the doctor, not any one clinic, so they're
  // deliberately global here. DoctorClinicAffiliation (below) is the
  // actual clinic-scoped join table and IS filtered.
  { name: 'IndependentAvailability', entity: IndependentAvailability, timestampField: 'updatedAt', clinicScope: { type: 'global' }, foreignKeys: [{ field: 'doctorUserId', refEntity: User }] },
  { name: 'DoctorProfile', entity: DoctorProfile, timestampField: 'updatedAt', clinicScope: { type: 'global' }, foreignKeys: [{ field: 'userId', refEntity: User }] },
  { name: 'DoctorLocation', entity: DoctorLocation, timestampField: 'updatedAt', clinicScope: { type: 'global' }, foreignKeys: [{ field: 'doctorUserId', refEntity: User }] },
  { name: 'DoctorClinicAffiliation', entity: DoctorClinicAffiliation, timestampField: 'updatedAt', clinicScope: direct, foreignKeys: [{ field: 'doctorUserId', refEntity: User }] },
  { name: 'PatientFile', entity: PatientFile, timestampField: 'createdAt', clinicScope: direct },
  { name: 'Notice', entity: Notice, timestampField: 'updatedAt', clinicScope: direct, foreignKeys: [{ field: 'createdByUserId', refEntity: User }] },
];
