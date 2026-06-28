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
}

export const SYNC_REGISTRY: SyncRegistryEntry[] = [
  { name: 'Patient', entity: Patient, timestampField: 'updatedAt' },
  { name: 'Vitals', entity: Vitals, timestampField: 'createdAt' },
  { name: 'Appointment', entity: Appointment, timestampField: 'updatedAt' },
  { name: 'ClinicalRecord', entity: ClinicalRecord, timestampField: 'updatedAt' },
  { name: 'Prescription', entity: Prescription, timestampField: 'updatedAt' },
  { name: 'DentalChart', entity: DentalChart, timestampField: 'updatedAt' },
  { name: 'BloodTest', entity: BloodTest, timestampField: 'updatedAt' },
  { name: 'LabWork', entity: LabWork, timestampField: 'updatedAt' },
  { name: 'PrescriptionTemplate', entity: PrescriptionTemplate, timestampField: 'updatedAt' },
  { name: 'Invoice', entity: Invoice, timestampField: 'updatedAt' },
  { name: 'PayrollDeductionRule', entity: PayrollDeductionRule, timestampField: 'updatedAt' },
  { name: 'PayrollEntry', entity: PayrollEntry, timestampField: 'updatedAt' },
  { name: 'PayrollRun', entity: PayrollRun, timestampField: 'updatedAt' },
  { name: 'DoctorCommission', entity: DoctorCommission, timestampField: 'createdAt' },
  { name: 'Vendor', entity: Vendor, timestampField: 'updatedAt' },
  { name: 'Expense', entity: Expense, timestampField: 'updatedAt' },
  { name: 'Product', entity: Product, timestampField: 'updatedAt' },
  { name: 'PurchaseOrder', entity: PurchaseOrder, timestampField: 'updatedAt' },
  { name: 'Attendance', entity: Attendance, timestampField: 'updatedAt' },
  { name: 'Shift', entity: Shift, timestampField: 'updatedAt' },
  { name: 'ShiftAssignment', entity: ShiftAssignment, timestampField: 'updatedAt' },
  { name: 'ShiftPattern', entity: ShiftPattern, timestampField: 'updatedAt' },
  { name: 'Leave', entity: Leave, timestampField: 'updatedAt' },
  { name: 'Holiday', entity: Holiday, timestampField: 'updatedAt' },
  { name: 'Task', entity: Task, timestampField: 'updatedAt' },
  { name: 'ConsentTemplate', entity: ConsentTemplate, timestampField: 'updatedAt' },
  { name: 'ConsentSubmission', entity: ConsentSubmission, timestampField: 'createdAt' },
  { name: 'IntakeFormTemplate', entity: IntakeFormTemplate, timestampField: 'updatedAt' },
  { name: 'IntakeFormSubmission', entity: IntakeFormSubmission, timestampField: 'createdAt' },
  { name: 'WaitingQueue', entity: WaitingQueue, timestampField: 'updatedAt' },
  { name: 'WalletTransaction', entity: WalletTransaction, timestampField: 'createdAt' },
  { name: 'PatientWallet', entity: PatientWallet, timestampField: 'updatedAt' },
  { name: 'ClinicService', entity: ClinicService, timestampField: 'updatedAt' },
  { name: 'DowngradeSelection', entity: DowngradeSelection, timestampField: 'updatedAt' },
  { name: 'Branch', entity: Branch, timestampField: 'updatedAt' },
  { name: 'Clinic', entity: Clinic, timestampField: 'updatedAt' },
  { name: 'Role', entity: Role, timestampField: 'updatedAt' },
  { name: 'Permission', entity: Permission, timestampField: 'updatedAt' },
  { name: 'UserRole', entity: UserRole, timestampField: 'createdAt' },
  { name: 'User', entity: User, timestampField: 'updatedAt' },
  { name: 'AuditLog', entity: AuditLog, timestampField: 'createdAt' },
  { name: 'ApiKey', entity: ApiKey, timestampField: 'updatedAt' },
  { name: 'IndependentAvailability', entity: IndependentAvailability, timestampField: 'updatedAt' },
  { name: 'DoctorProfile', entity: DoctorProfile, timestampField: 'updatedAt' },
  { name: 'DoctorLocation', entity: DoctorLocation, timestampField: 'updatedAt' },
  { name: 'DoctorClinicAffiliation', entity: DoctorClinicAffiliation, timestampField: 'updatedAt' },
  { name: 'PatientFile', entity: PatientFile, timestampField: 'createdAt' },
  { name: 'Notice', entity: Notice, timestampField: 'updatedAt' },
];
