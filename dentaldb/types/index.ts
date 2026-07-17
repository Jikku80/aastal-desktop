// ─── Auth ─────────────────────────────────────────────────────────────────────
export type UserRole = 'super_admin' | 'owner' | 'dentist' | 'doctor' | 'receptionist' | 'accountant' | 'staff';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  phone?: string;
  avatar?: string;
  clinicId?: string;
  isActive: boolean;
  nmcNo?: string;
  lastLoginAt?: string;
  createdAt: string;
}

// ─── Branch ───────────────────────────────────────────────────────────────────
export interface Branch {
  id: string;
  clinicId: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  latitude?: number | null;
  longitude?: number | null;
  /**
   * Independent public-visibility toggle for this branch. The clinic-level
   * `isPubliclyListed` flag acts as the master switch — a branch is only
   * actually visible on the public/discovery side when BOTH the clinic and
   * this branch flag are true.
   */
  isPubliclyListed?: boolean;
  /**
   * Whether this branch is active (usable, accepting appointments etc.).
   * Driven by subscription quota: if the clinic has more branches than
   * the plan allows active, excess branches have isActive=false.
   * Users choose which branches stay active via the downgrade selection UI.
   */
  isActive: boolean;
  /**
   * Hard quota lock: the clinic has MORE total branches than the plan
   * allows (i.e. they downgraded below their branch count).
   * isLocked branches are fully read-only and cannot even be activated
   * until the plan is upgraded. Data is preserved.
   */
  isLocked?: boolean;
  /** Legacy fields — kept for DB compatibility, no longer used in business logic. */
  activatedAt?: string | null;
  activationPeriodEnd?: string | null;
  staff?: User[];
  createdAt: string;
  updatedAt: string;
}

// ─── Clinic ───────────────────────────────────────────────────────────────────
export type SubscriptionPlan = 'free' | 'pro' | 'enterprise';

export interface Clinic {
  id: string;
  name: string;
  slug: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  logo?: string;
  website?: string;
  licenseNumber?: string;
  plan: SubscriptionPlan;
  workingHours?: WorkingHours;
  settings?: Record<string, any>;
  isActive: boolean;
  trialEndsAt?: string;
  subscriptionEndsAt?: string;
  createdAt: string;
}

export interface WorkingHours {
  monday?:    { start: string; end: string } | null;
  tuesday?:   { start: string; end: string } | null;
  wednesday?: { start: string; end: string } | null;
  thursday?:  { start: string; end: string } | null;
  friday?:    { start: string; end: string } | null;
  saturday?:  { start: string; end: string } | null;
  sunday?:    { start: string; end: string } | null;
}

// ─── Patient ──────────────────────────────────────────────────────────────────
export type Gender     = 'male' | 'female' | 'other';
export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'O+' | 'O-' | 'AB+' | 'AB-';

export interface Patient {
  id: string;
  clinicId: string;
  branchId?: string;
  branch?: Branch;
  opdNo?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  ageYears?: number;
  gender?: Gender;
  bloodGroup?: BloodGroup;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  allergies: string[];
  medicalConditions: string[];
  currentMedications: string[];
  dentalHistory?: Record<string, any>;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  notes?: string;
  avatar?: string;
  isActive: boolean;
  lastVisitAt?: string;
  createdAt: string;
  age?: number;
  fullName: string;
}

// ─── Appointment ──────────────────────────────────────────────────────────────
export type AppointmentStatus =
  | 'scheduled' | 'confirmed' | 'in_progress'
  | 'completed'  | 'cancelled'  | 'no_show' | 'rescheduled';

export type AppointmentType =
  | 'consultation' | 'cleaning'     | 'filling'
  | 'extraction'   | 'root_canal'   | 'crown'
  | 'orthodontics' | 'whitening'    | 'xray'
  | 'emergency'    | 'followup'     | 'other';

export interface Appointment {
  id: string;
  clinicId: string;
  branchId?: string;
  branch?: Branch;
  patientId: string;
  patient?: Patient;
  dentistId: string;
  dentist?: User;
  type: AppointmentType;
  status: AppointmentStatus;
  scheduledAt: string;
  endsAt: string;
  durationMinutes: number;
  notes?: string;
  chiefComplaint?: string;
  diagnosis?: string;
  treatment?: string;
  fee?: number;
  isPaid: boolean;
  reminderSentAt?: string;
  doctorReminderSentAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Invoice ──────────────────────────────────────────────────────────────────
export type InvoiceStatus  = 'draft' | 'sent' | 'paid' | 'partially_paid' | 'not_yet_paid' | 'overdue' | 'cancelled' | 'refunded';
// dentaldb/types/index.ts
export type PaymentMethod  = 'cash'  | 'esewa' | 'khalti' | 'paypal' | 'bank_transfer' | 'insurance' | 'wallet_credit' | 'wallet_debit';

export interface InvoiceItem {
  description: string;
  quantity:    number;
  unitPrice:   number;
  total:       number;
}

export interface Invoice {
  id: string;
  clinicId: string;
  branchId?: string;
  branch?: Branch;
  invoiceNumber: string;
  patientId: string;
  patient?: Patient;
  appointmentId?: string;
  appointment?: Appointment;
  items: InvoiceItem[];
  subtotal: number;
  taxPercent: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  paidAmount: number;
  dueAmount: number;
  status: InvoiceStatus;
  paymentMethod?: PaymentMethod;
  paymentTransactionId?: string;
  paidAt?: string;
  dueDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Website ──────────────────────────────────────────────────────────────────
export type TemplateId = 'modern' | 'classic' | 'minimal' | 'bold' | 'warm';

export interface ClinicWebsite {
  id: string;
  clinicId: string;
  templateId: TemplateId;
  isPublished: boolean;
  subdomain: string;
  customDomain?: string;
  domainVerified: boolean;
  seo: {
    title: string;
    description: string;
    keywords: string[];
    googleAnalyticsId?: string;
    facebookPixelId?: string;
  };
  content: Record<string, any>;
  theme: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    fontHeading: string;
    fontBody: string;
  };
  createdAt: string;
  updatedAt: string;
}
// ─── Attendance ────────────────────────────────────────────────────────────────
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'half_day';

export interface Attendance {
  id: string;
  clinicId: string;
  branchId?: string;
  userId: string;
  user?: User;
  date: string;
  checkIn?: string;
  checkOut?: string;
  hoursWorked?: number;
  status: AttendanceStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Leave ─────────────────────────────────────────────────────────────────────
export type LeaveType   = 'sick' | 'casual' | 'annual' | 'unpaid' | 'other';
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface Leave {
  id: string;
  clinicId: string;
  userId: string;
  user?: User;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason?: string;
  status: LeaveStatus;
  approvedByUserId?: string;
  approvalNote?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── UI Components ────────────────────────────────────────────────────────────
export type ActionVariant = 'default' | 'danger' | 'primary' | 'success' | 'warning';

// ─── Clinic Service ───────────────────────────────────────────────────────────
export interface ClinicService {
  id: string;
  clinicId: string;
  name: string;
  description?: string;
  price: number;
  duration: number;
  commissionPercentage?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Product / Inventory ──────────────────────────────────────────────────────
export interface Product {
  id: string;
  clinicId: string;
  name: string;
  description?: string;
  price: number;
  stockQuantity: number;
  unit?: string;
  purchaseUnit?: string;
  unitsPerPurchase?: number;
  sku?: string;
  isActive: boolean;
  reorderPoint: number;
  supplierName?: string;
  supplierPhone?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface POItem {
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
  purchaseUnit?: string;
  unitsPerPurchase?: number;
}

export interface PurchaseOrder {
  id: string;
  clinicId: string;
  branchId?: string;
  supplierName?: string;
  supplierPhone?: string;
  items: POItem[];
  totalCost: number;
  status: 'draft' | 'ordered' | 'received' | 'cancelled';
  notes?: string;
  orderedAt?: string;
  receivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Doctor Commission ────────────────────────────────────────────────────────
export interface DoctorCommission {
  id: string;
  clinicId: string;
  doctorId: string;
  doctor?: User;
  invoiceId: string;
  serviceId?: string;
  service?: ClinicService;
  amount: number;
  serviceRevenue: number;
  commissionPercentage: number;
  createdAt: string;
}

export interface CommissionSummaryDoctor {
  doctorId: string;
  doctor?: User;
  totalServiceRevenue: number;
  totalCommission: number;
  byService: {
    serviceId: string;
    service?: ClinicService;
    revenue: number;
    commission: number;
  }[];
}

export interface CommissionSummary {
  doctors: CommissionSummaryDoctor[];
  totals: { totalServiceRevenue: number; totalCommission: number };
}

// ─── Clinical Records ─────────────────────────────────────────────────────────
export interface Prescription {
  id: string;
  clinicalRecordId: string;
  medicineName: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
  createdAt: string;
}

export interface ClinicalRecord {
  id: string;
  clinicId: string;
  patientId: string;
  patient?: Patient;
  doctorId: string;
  doctor?: User;
  appointmentId?: string;
  diagnosisNotes?: string;
  treatmentPlan?: string;
  attachments?: { name: string; url: string; type: string }[];
  prescriptions: Prescription[];
  createdAt: string;
  updatedAt: string;
}