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
import { LabWork } from '../lab-work/entities/lab-work.entity';
import { LabService } from '../lab-work/entities/lab-service.entity';
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
  // Not strictly 'updatedAt' | 'createdAt' — several entities record their
  // conflict-resolution timestamp under a differently-named
  // @CreateDateColumn/@UpdateDateColumn (e.g. ConsentSubmission.signedAt,
  // IntakeFormSubmission.submittedAt, UserRole.assignedAt, Vitals.recordedAt).
  // The narrower union previously here didn't stop those from being
  // declared as 'createdAt' anyway (the literal type doesn't verify against
  // the entity's real columns), which produced a property that doesn't
  // exist on the entity — TypeORM throws EntityPropertyNotFoundError the
  // first time it's queried against, in generateChangesSince's repo.find(),
  // for EVERY clinic, aborting that entity's row entirely.
  timestampField: string;
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
   * Every other scalar FK column on this entity that references another
   * SYNC_REGISTRY entity's id, distinct from the clinicScope relationship
   * (e.g. Task.assignedToUserId -> User, Appointment.branchId -> Branch).
   * This list should be exhaustive for every REAL DB-level FOREIGN KEY
   * constraint on the entity's table (see the sqlite migrations — that's
   * the schema that actually enforces these at commit) whose target is
   * itself a SYNC_REGISTRY entity. The clinicScope's own field (clinicId
   * for 'direct', localField for 'via') is already remapped separately in
   * pullChanges and does not need to be repeated here.
   *
   * Two independent reasons an entry needs to be here, either one enough
   * on its own:
   *   1. Remap safety — when the referenced entity's id gets remapped via
   *      uniqueFields reconciliation (currently User.email, Permission.key,
   *      Clinic.slug), any OTHER entity's row in the SAME pull that still
   *      points at the old id throws "FOREIGN KEY constraint failed" at
   *      commit unless it's rewritten first.
   *   2. Insert ordering — SYNC_APPLY_ORDER (computeSyncApplyOrder below)
   *      only knows to order the referenced entity before this one if the
   *      dependency is declared here. An undeclared FK can still work by
   *      accident (if the referenced entity happens to sit earlier in the
   *      raw SYNC_REGISTRY array below) or fail outright in the
   *      non-deferred retry pass (see pullChanges) if it doesn't.
   *
   * Audited exhaustively against every table's actual FK constraints as of
   * 2026-07-24 (see the Leave/DoctorClinicAffiliation postmortems above —
   * both were caused by exactly this kind of gap). If a new @ManyToOne/
   * @JoinColumn relation is added to a synced entity's DB table, re-check
   * this list.
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
  { name: 'Patient', entity: Patient, timestampField: 'updatedAt', clinicScope: direct, foreignKeys: [{ field: 'branchId', refEntity: Branch }] },
  // timestampField MUST be 'recordedAt' — that's Vitals' actual
  // @CreateDateColumn (see vitals.entity.ts). This was wrongly declared as
  // 'createdAt', a column Vitals doesn't have, which made
  // generateChangesSince's repo.find({ where: { createdAt: MoreThan(since) } })
  // throw EntityPropertyNotFoundError on every single GET /sync/changes
  // call, for every clinic — since generateChangesSince iterates the whole
  // registry inside one try-less loop, this one bad entry aborted the pull
  // before ANY entity (including Branch, User, Clinic) ever got returned.
  // That's why desktop clients never received branch/staff/etc. data no
  // matter how many times they synced.
  { name: 'Vitals', entity: Vitals, timestampField: 'recordedAt', clinicScope: direct, foreignKeys: [{ field: 'recordedBy', refEntity: User }, { field: 'patientId', refEntity: Patient }, { field: 'appointmentId', refEntity: Appointment }] },
  { name: 'Appointment', entity: Appointment, timestampField: 'updatedAt', clinicScope: direct, foreignKeys: [{ field: 'dentistId', refEntity: User }, { field: 'branchId', refEntity: Branch }, { field: 'patientId', refEntity: Patient }, { field: 'serviceId', refEntity: ClinicService }] },
  { name: 'ClinicalRecord', entity: ClinicalRecord, timestampField: 'updatedAt', clinicScope: direct, foreignKeys: [{ field: 'doctorId', refEntity: User }, { field: 'patientId', refEntity: Patient }] },
  // No clinicId column — scope indirectly via the clinical record it belongs to.
  // timestampField is 'createdAt' — Prescription has NO updatedAt column at
  // all (see clinical-record.entity.ts; it's a @CreateDateColumn-only
  // entity, unlike its sibling ClinicalRecord in the same file, which does
  // have both). Same wrong-field bug as Vitals/ConsentSubmission/
  // IntakeFormSubmission/UserRole below — all five caused
  // EntityPropertyNotFoundError on every GET /sync/changes call, for every
  // clinic, aborting the whole registry loop before it could return any
  // entity at all (see generateChangesSince — it iterates SYNC_REGISTRY in
  // one unguarded loop, so ONE bad entry blocks everything after it too).
  { name: 'Prescription', entity: Prescription, timestampField: 'createdAt', clinicScope: { type: 'via', viaEntity: ClinicalRecord, localField: 'clinicalRecordId' } },
  { name: 'DentalChart', entity: DentalChart, timestampField: 'updatedAt', clinicScope: direct, foreignKeys: [{ field: 'patientId', refEntity: Patient }] },
  { name: 'LabWork', entity: LabWork, timestampField: 'updatedAt', clinicScope: direct, foreignKeys: [{ field: 'orderedById', refEntity: User }, { field: 'patientId', refEntity: Patient }] },
  { name: 'LabService', entity: LabService, timestampField: 'updatedAt', clinicScope: direct },
  { name: 'PrescriptionTemplate', entity: PrescriptionTemplate, timestampField: 'updatedAt', clinicScope: direct },
  { name: 'Invoice', entity: Invoice, timestampField: 'updatedAt', clinicScope: direct, foreignKeys: [{ field: 'branchId', refEntity: Branch }, { field: 'patientId', refEntity: Patient }, { field: 'appointmentId', refEntity: Appointment }] },
  { name: 'PayrollDeductionRule', entity: PayrollDeductionRule, timestampField: 'updatedAt', clinicScope: direct },
  { name: 'PayrollEntry', entity: PayrollEntry, timestampField: 'updatedAt', clinicScope: direct, foreignKeys: [{ field: 'userId', refEntity: User }, { field: 'payrollRunId', refEntity: PayrollRun }] },
  { name: 'PayrollRun', entity: PayrollRun, timestampField: 'updatedAt', clinicScope: direct },
  { name: 'DoctorCommission', entity: DoctorCommission, timestampField: 'createdAt', clinicScope: direct, foreignKeys: [{ field: 'doctorId', refEntity: User }, { field: 'invoiceId', refEntity: Invoice }, { field: 'serviceId', refEntity: ClinicService }] },
  { name: 'Vendor', entity: Vendor, timestampField: 'updatedAt', clinicScope: direct },
  { name: 'Expense', entity: Expense, timestampField: 'updatedAt', clinicScope: direct, foreignKeys: [{ field: 'vendorId', refEntity: Vendor }] },
  { name: 'Product', entity: Product, timestampField: 'updatedAt', clinicScope: direct, foreignKeys: [{ field: 'branchId', refEntity: Branch }] },
  { name: 'PurchaseOrder', entity: PurchaseOrder, timestampField: 'updatedAt', clinicScope: direct },
  { name: 'Attendance', entity: Attendance, timestampField: 'updatedAt', clinicScope: direct, foreignKeys: [{ field: 'userId', refEntity: User }, { field: 'shiftId', refEntity: Shift }] },
  { name: 'Shift', entity: Shift, timestampField: 'updatedAt', clinicScope: direct },
  { name: 'ShiftAssignment', entity: ShiftAssignment, timestampField: 'updatedAt', clinicScope: direct, foreignKeys: [{ field: 'userId', refEntity: User }, { field: 'shiftId', refEntity: Shift }] },
  { name: 'ShiftPattern', entity: ShiftPattern, timestampField: 'updatedAt', clinicScope: direct, foreignKeys: [{ field: 'userId', refEntity: User }, { field: 'shiftId', refEntity: Shift }] },
  // Leave has TWO scalar FKs to User: userId (the person on leave) and
  // approvedByUserId (who approved/rejected it, nullable until acted on).
  // approvedByUserId was previously undeclared here, so applyRemap never
  // rewrote it when the referenced User got reconciled onto a different
  // local id via uniqueFields — the stale id survived into the insert and
  // only surfaced as "FOREIGN KEY constraint failed" at commitTransaction
  // (deferred FK check). Both must be listed or the same class of bug
  // recurs for any entity with more than one FK to the same ref entity.
  { name: 'Leave', entity: Leave, timestampField: 'updatedAt', clinicScope: direct, foreignKeys: [{ field: 'userId', refEntity: User }, { field: 'approvedByUserId', refEntity: User }] },
  { name: 'Holiday', entity: Holiday, timestampField: 'updatedAt', clinicScope: direct, foreignKeys: [{ field: 'branchId', refEntity: Branch }] },
  { name: 'Task', entity: Task, timestampField: 'updatedAt', clinicScope: direct, foreignKeys: [{ field: 'assignedToUserId', refEntity: User }, { field: 'createdByUserId', refEntity: User }, { field: 'assignedToBranchId', refEntity: Branch }] },
  { name: 'ConsentTemplate', entity: ConsentTemplate, timestampField: 'updatedAt', clinicScope: direct },
  // No clinicId column — scope indirectly via the appointment it was signed against.
  // timestampField is 'signedAt' — that's ConsentSubmission's actual
  // @CreateDateColumn (see consent-submission.entity.ts). Was wrongly
  // declared 'createdAt', a column this entity doesn't have — see the
  // Vitals fix above for the exact same failure mode (EntityPropertyNotFoundError
  // aborting every GET /sync/changes call for every clinic).
  { name: 'ConsentSubmission', entity: ConsentSubmission, timestampField: 'signedAt', clinicScope: { type: 'via', viaEntity: Appointment, localField: 'appointmentId' } },
  { name: 'IntakeFormTemplate', entity: IntakeFormTemplate, timestampField: 'updatedAt', clinicScope: direct },
  // timestampField is 'submittedAt' — IntakeFormSubmission's actual
  // @CreateDateColumn (see intake-form-submission.entity.ts). Same wrong-
  // 'createdAt' bug as ConsentSubmission above.
  { name: 'IntakeFormSubmission', entity: IntakeFormSubmission, timestampField: 'submittedAt', clinicScope: { type: 'via', viaEntity: Appointment, localField: 'appointmentId' } },
  { name: 'WaitingQueue', entity: WaitingQueue, timestampField: 'updatedAt', clinicScope: direct, foreignKeys: [{ field: 'doctorId', refEntity: User }, { field: 'patientId', refEntity: Patient }, { field: 'appointmentId', refEntity: Appointment }] },
  { name: 'WalletTransaction', entity: WalletTransaction, timestampField: 'createdAt', clinicScope: direct, foreignKeys: [{ field: 'walletId', refEntity: PatientWallet }] },
  { name: 'PatientWallet', entity: PatientWallet, timestampField: 'updatedAt', clinicScope: direct },
  { name: 'ClinicService', entity: ClinicService, timestampField: 'updatedAt', clinicScope: direct },
  { name: 'DowngradeSelection', entity: DowngradeSelection, timestampField: 'updatedAt', clinicScope: direct },
  // `staff` is a ManyToMany (owning side, join table `user_branches`) —
  // eager: false, so it was never picked up by the sync engine's plain
  // repo.find() calls. Without manyToManyFields declared here, the
  // outgoing payload never carried branch-staff assignments to a device's
  // local SQLite DB at all, so a non-admin's `/branches/my` query (an
  // INNER JOIN against that same join table) always returned zero rows
  // locally — even though the assignment existed and worked fine against
  // the hosted Postgres DB the web app talks to directly. Owner/super_admin
  // never hit this because their branch list comes from a plain
  // `findAll(clinicId)`, not the staff join.
  { name: 'Branch', entity: Branch, timestampField: 'updatedAt', clinicScope: direct, manyToManyFields: [{ field: 'staff', refEntity: User }] },
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
  // timestampField is 'assignedAt' — UserRole's actual @CreateDateColumn
  // (see user-role.entity.ts). Same wrong-'createdAt' bug as
  // ConsentSubmission/IntakeFormSubmission/Vitals above.
  { name: 'UserRole', entity: UserRole, timestampField: 'assignedAt', clinicScope: { type: 'via', viaEntity: User, localField: 'userId' }, foreignKeys: [{ field: 'roleId', refEntity: Role }] },
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
  { name: 'IndependentAvailability', entity: IndependentAvailability, timestampField: 'updatedAt', clinicScope: { type: 'global' }, foreignKeys: [{ field: 'doctorUserId', refEntity: User }, { field: 'locationId', refEntity: DoctorLocation }] },
  { name: 'DoctorProfile', entity: DoctorProfile, timestampField: 'updatedAt', clinicScope: { type: 'global' }, foreignKeys: [{ field: 'userId', refEntity: User }] },
  { name: 'DoctorLocation', entity: DoctorLocation, timestampField: 'updatedAt', clinicScope: { type: 'global' }, foreignKeys: [{ field: 'doctorUserId', refEntity: User }] },
  // branchId is a real DB-level FK (branches.id, nullable, ON DELETE SET
  // NULL — see doctor-clinic-affiliations migration) that was previously
  // undeclared here, same class of gap as Leave.approvedByUserId above:
  // undeclared FK columns aren't guaranteed a place in the dependency
  // graph SYNC_APPLY_ORDER computes, so nothing enforces Branch landing
  // locally before a row that references it. Declaring it closes that gap
  // explicitly instead of relying on Branch's incidental position earlier
  // in the raw array.
  { name: 'DoctorClinicAffiliation', entity: DoctorClinicAffiliation, timestampField: 'updatedAt', clinicScope: direct, foreignKeys: [{ field: 'doctorUserId', refEntity: User }, { field: 'branchId', refEntity: Branch }] },
  { name: 'PatientFile', entity: PatientFile, timestampField: 'createdAt', clinicScope: direct, foreignKeys: [{ field: 'patientId', refEntity: Patient }] },
  { name: 'Notice', entity: Notice, timestampField: 'updatedAt', clinicScope: direct, foreignKeys: [{ field: 'createdByUserId', refEntity: User }] },
];

/**
 * Dependency-safe ordering of SYNC_REGISTRY — a referenced entity
 * (declared via clinicScope 'via', foreignKeys, or manyToManyFields) is
 * always ordered before anything that points at it.
 *
 * Originally added for pushPending only: each entity's pending rows go
 * out in their own HTTP call / remote transaction, with FK checks
 * enforced immediately (Postgres has no equivalent of deferring across
 * separate requests). Pushing Appointment (which has a dentistId -> User
 * foreign key) before User has ever been pushed threw "insert or update
 * on table appointments violates foreign key constraint" on the remote —
 * and because that's a distinct error class from the UNIQUE-violation
 * safety net in applyIncoming, it wasn't caught: it propagated out of
 * pushPending() and aborted every entity queued after it. Since the raw
 * array order never changes, every retry failed on the exact same row,
 * wedging that clinic's sync permanently.
 *
 * Also used by pullChanges now, as the base ordering before its
 * deferred-FK-checked transaction — see SyncService.pullChanges for why
 * pull additionally needs a non-deferred retry path even with a correct
 * order (a row whose FK target was skipped/reconciled elsewhere can't be
 * fixed by ordering alone).
 *
 * Computed once at module load and reused for every push and pull.
 */
export function computeSyncApplyOrder(registry: SyncRegistryEntry[] = SYNC_REGISTRY): SyncRegistryEntry[] {
  const byEntity = new Map<Function, SyncRegistryEntry>();
  for (const entry of registry) byEntity.set(entry.entity, entry);

  const dependenciesOf = (entry: SyncRegistryEntry): Function[] => {
    const deps: Function[] = [];
    if (entry.clinicScope.type === 'via') deps.push(entry.clinicScope.viaEntity);
    for (const fk of entry.foreignKeys ?? []) deps.push(fk.refEntity);
    for (const m2m of entry.manyToManyFields ?? []) deps.push(m2m.refEntity);
    return deps;
  };

  const ordered: SyncRegistryEntry[] = [];
  const visited = new Set<Function>();
  const visiting = new Set<Function>(); // guards against an accidental cycle in the declared deps

  const visit = (entry: SyncRegistryEntry) => {
    if (visited.has(entry.entity) || visiting.has(entry.entity)) return;
    visiting.add(entry.entity);
    for (const dep of dependenciesOf(entry)) {
      const depEntry = byEntity.get(dep);
      if (depEntry) visit(depEntry);
    }
    visiting.delete(entry.entity);
    visited.add(entry.entity);
    ordered.push(entry);
  };

  for (const entry of registry) visit(entry);
  return ordered;
}

/** Precomputed once — pushPending() and pullChanges() both iterate this instead of raw SYNC_REGISTRY order. */
export const SYNC_APPLY_ORDER: SyncRegistryEntry[] = computeSyncApplyOrder();