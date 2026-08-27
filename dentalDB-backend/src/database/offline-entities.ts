// AUTO-GENERATED explicit entity list for the SQLite (offline/desktop) DB.
// Deliberately excludes online-only modules (no tables in this DB at all):
// subscriptions, super-admin, website-builder, seo, discovery, telehealth,
// patient-auth, patient-portal, analytics, symptom-checker, doctor-portal,
// reviews (requires a patient-auth PatientAccount FK — see
// data-source.sqlite.ts for how this was discovered).
// See data-source.sqlite.ts for the rationale. Regenerate, do not hand-edit.
// Used by: data-source.sqlite.ts + typeorm-options.factory.ts (sqlite driver).
import { ApiKey } from '../api-keys/entities/api-key.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { Vitals } from '../appointments/entities/vitals.entity';
import { Attendance } from '../attendance/entities/attendance.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { AuthCache } from '../auth/entities/auth-cache.entity';
import { Invoice } from '../billing/entities/invoice.entity';
import { Branch } from '../branch/entities/branch.entity';
import { DowngradeSelection } from '../branch/entities/downgrade-selection.entity';
import { ClinicalRecord, Prescription } from '../clinical-records/entities/clinical-record.entity';
import { Clinic } from '../clinics/entities/clinic.entity';
import { DoctorCommission } from '../commissions/entities/commission.entity';
import { ConsentSubmission } from '../consents/entities/consent-submission.entity';
import { ConsentTemplate } from '../consents/entities/consent-template.entity';
import { DentalChart } from '../dental-chart/entities/dental-chart.entity';
import { DoctorClinicAffiliation } from '../doctor-affiliation/entities/doctor-clinic-affiliation.entity';
import { DoctorLocation } from '../doctor-profile/entities/doctor-location.entity';
import { DoctorProfile } from '../doctor-profile/entities/doctor-profile.entity';
import { IndependentAvailability } from '../doctor-profile/entities/independent-availability.entity';
import { Expense } from '../expenses/entities/expense.entity';
import { Vendor } from '../expenses/entities/vendor.entity';
import { PatientFile } from '../files/entities/patient-file.entity';
import { Holiday } from '../holidays/entities/holiday.entity';
import { IntakeFormSubmission } from '../intake-forms/entities/intake-form-submission.entity';
import { IntakeFormTemplate } from '../intake-forms/entities/intake-form-template.entity';
import { Product } from '../inventory/entities/product.entity';
import { PurchaseOrder } from '../inventory/entities/purchase-order.entity';
import { InventoryConsumptionEvent } from '../inventory/entities/inventory-consumption.entity';
import { MedicineBatch } from '../pharmacy/entities/medicine-batch.entity';
import { BatchNotificationLog } from '../pharmacy/entities/batch-notification-log.entity';
import { TreatmentPlanItem } from '../treatment-plans/entities/treatment-plan-item.entity';
import { LabWork } from '../lab-work/entities/lab-work.entity';
import { LabService } from '../lab-work/entities/lab-service.entity';
import { Leave } from '../leave/entities/leave.entity';
import { Notice } from '../notices/entities/notice.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { OutboxItem } from '../outbox/entities/outbox-item.entity';
import { PatientWallet } from '../patient-wallet/entities/patient-wallet.entity';
import { WalletTransaction } from '../patient-wallet/entities/wallet-transaction.entity';
import { Patient } from '../patients/entities/patient.entity';
import { PayrollDeductionRule } from '../payroll/entities/payroll-deduction-rule.entity';
import { PayrollEntry } from '../payroll/entities/payroll-entry.entity';
import { PayrollRun } from '../payroll/entities/payroll-run.entity';
import { PrescriptionTemplate } from '../prescription/entities/prescription-template.entity';
import { Permission } from '../rbac/entities/permission.entity';
import { Role } from '../rbac/entities/role.entity';
import { UserRole } from '../rbac/entities/user-role.entity';
import { Recall } from '../recalls/entities/recall.entity';
import { ClinicService } from '../services/entities/service.entity';
import { ShiftAssignment } from '../shifts/entities/shift-assignment.entity';
import { ShiftPattern } from '../shifts/entities/shift-pattern.entity';
import { Shift } from '../shifts/entities/shift.entity';
import { SyncDevice } from '../sync/entities/sync-device.entity';
import { SyncMeta } from '../sync/entities/sync-meta.entity';
import { Task } from '../tasks/entities/task.entity';
import { User } from '../users/entities/user.entity';
import { WaitingQueue } from '../waiting-queue/entities/waiting-queue.entity';
import { Account } from '../finance/entities/account.entity';
import { JournalEntry } from '../finance/entities/journal-entry.entity';
import { JournalLine } from '../finance/entities/journal-line.entity';
import { AccountingPeriod } from '../finance/entities/accounting-period.entity';

export const OFFLINE_ENTITIES = [
  ApiKey,
  Appointment,
  Vitals,
  Attendance,
  AuditLog,
  AuthCache,
  Invoice,
  Branch,
  DowngradeSelection,
  ClinicalRecord,
  Prescription,
  Clinic,
  DoctorCommission,
  ConsentSubmission,
  ConsentTemplate,
  DentalChart,
  DoctorClinicAffiliation,
  DoctorLocation,
  DoctorProfile,
  IndependentAvailability,
  Expense,
  Vendor,
  PatientFile,
  Holiday,
  IntakeFormSubmission,
  IntakeFormTemplate,
  Product,
  PurchaseOrder,
  InventoryConsumptionEvent,
  MedicineBatch,
  BatchNotificationLog,
  TreatmentPlanItem,
  LabWork,
  LabService,
  Leave,
  Notice,
  Notification,
  OutboxItem,
  PatientWallet,
  WalletTransaction,
  Patient,
  PayrollDeductionRule,
  PayrollEntry,
  PayrollRun,
  PrescriptionTemplate,
  Permission,
  Role,
  UserRole,
  Recall,
  ClinicService,
  ShiftAssignment,
  ShiftPattern,
  Shift,
  SyncDevice,
  SyncMeta,
  Task,
  User,
  WaitingQueue,
  Account,
  JournalEntry,
  JournalLine,
  AccountingPeriod,
];