// AUTO-GENERATED explicit entity list — replaces TypeORM's filesystem-glob
// entity discovery, which breaks once the backend is bundled into a single
// file for the Electron build (esbuild collapses all compiled files, so
// __dirname + '**/*.entity.js' finds nothing on disk).
// Regenerate by re-running the generator if entities are added/removed —
// do not hand-edit the import list.
// Used by: data-source.postgres.ts (full entity set, online/server DB).
import { ApiKey } from '../api-keys/entities/api-key.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { Vitals } from '../appointments/entities/vitals.entity';
import { Attendance } from '../attendance/entities/attendance.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { AuthCache } from '../auth/entities/auth-cache.entity';
import { Invoice } from '../billing/entities/invoice.entity';
import { BloodTest } from '../blood-test/entities/blood-test.entity';
import { Branch } from '../branch/entities/branch.entity';
import { DowngradeSelection } from '../branch/entities/downgrade-selection.entity';
import { ClinicalRecord, Prescription } from '../clinical-records/entities/clinical-record.entity';
import { Clinic } from '../clinics/entities/clinic.entity';
import { DoctorCommission } from '../commissions/entities/commission.entity';
import { ConsentSubmission } from '../consents/entities/consent-submission.entity';
import { ConsentTemplate } from '../consents/entities/consent-template.entity';
import { DentalChart } from '../dental-chart/entities/dental-chart.entity';
import { DoctorClinicAffiliation } from '../doctor-affiliation/entities/doctor-clinic-affiliation.entity';
import { Referral } from '../doctor-portal/entities/referral.entity';
import { RefillRequest } from '../doctor-portal/entities/refill-request.entity';
import { DoctorLocation } from '../doctor-profile/entities/doctor-location.entity';
import { DoctorProfile } from '../doctor-profile/entities/doctor-profile.entity';
import { IndependentAvailability } from '../doctor-profile/entities/independent-availability.entity';
import { Expense } from '../expenses/entities/expense.entity';
import { Vendor } from '../expenses/entities/vendor.entity';
import { PatientFile } from '../files/entities/patient-file.entity';
import { GalleryItem } from '../gallery/entities/gallery-item.entity';
import { Holiday } from '../holidays/entities/holiday.entity';
import { IntakeFormSubmission } from '../intake-forms/entities/intake-form-submission.entity';
import { IntakeFormTemplate } from '../intake-forms/entities/intake-form-template.entity';
import { Product } from '../inventory/entities/product.entity';
import { PurchaseOrder } from '../inventory/entities/purchase-order.entity';
import { LabWork } from '../lab-work/entities/lab-work.entity';
import { Leave } from '../leave/entities/leave.entity';
import { Notice } from '../notices/entities/notice.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { OutboxItem } from '../outbox/entities/outbox-item.entity';
import { PatientAccountLink } from '../patient-auth/entities/patient-account-link.entity';
import { PatientAccount } from '../patient-auth/entities/patient-account.entity';
import { PatientRecordConsent } from '../patient-auth/entities/patient-record-consent.entity';
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
import { Review } from '../reviews/entities/review.entity';
import { BlogPost } from '../seo/entities/blog-post.entity';
import { SeoRedirect } from '../seo/entities/seo-redirect.entity';
import { ClinicService } from '../services/entities/service.entity';
import { ShiftAssignment } from '../shifts/entities/shift-assignment.entity';
import { ShiftPattern } from '../shifts/entities/shift-pattern.entity';
import { Shift } from '../shifts/entities/shift.entity';
import { SubscriptionRequest } from '../subscriptions/entities/subscription-request.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { SyncDevice } from '../sync/entities/sync-device.entity';
import { SyncMeta } from '../sync/entities/sync-meta.entity';
import { Task } from '../tasks/entities/task.entity';
import { User } from '../users/entities/user.entity';
import { WaitingQueue } from '../waiting-queue/entities/waiting-queue.entity';
import { ClinicWebsite } from '../website-builder/entities/clinic-website.entity';
import { ContactMessage } from '../website-builder/entities/contact-message.entity';
import { WebsiteOrder } from '../website-builder/entities/website-order.entity';

export const ALL_ENTITIES = [
  ApiKey,
  Appointment,
  Vitals,
  Attendance,
  AuditLog,
  AuthCache,
  Invoice,
  BloodTest,
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
  Referral,
  RefillRequest,
  DoctorLocation,
  DoctorProfile,
  IndependentAvailability,
  Expense,
  Vendor,
  PatientFile,
  GalleryItem,
  Holiday,
  IntakeFormSubmission,
  IntakeFormTemplate,
  Product,
  PurchaseOrder,
  LabWork,
  Leave,
  Notice,
  Notification,
  OutboxItem,
  PatientAccountLink,
  PatientAccount,
  PatientRecordConsent,
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
  Review,
  BlogPost,
  SeoRedirect,
  ClinicService,
  ShiftAssignment,
  ShiftPattern,
  Shift,
  SubscriptionRequest,
  Subscription,
  SyncDevice,
  SyncMeta,
  Task,
  User,
  WaitingQueue,
  ClinicWebsite,
  ContactMessage,
  WebsiteOrder,
];