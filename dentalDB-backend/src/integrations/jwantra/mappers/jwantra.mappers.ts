import { Patient } from '../../../patients/entities/patient.entity';
import { ClinicService } from '../../../services/entities/service.entity';
import { Invoice } from '../../../billing/entities/invoice.entity';
import { Appointment } from '../../../appointments/entities/appointment.entity';
import { Product } from '../../../inventory/entities/product.entity';
import { User } from '../../../users/entities/user.entity';
import { TreatmentPlanItem } from '../../../treatment-plans/entities/treatment-plan-item.entity';
import { InventoryConsumptionEvent } from '../../../inventory/entities/inventory-consumption.entity';
import { Branch } from '../../../branch/entities/branch.entity';

/** The clinic's own branches, mapped onto jwantra's `Branch` (core/models.py).
 * Synced FIRST, ahead of every other endpoint below — jwantra's
 * `resolve_branch_by_external_id` only ever created a stub branch named
 * generically "Branch" the first time it saw an unfamiliar branchId
 * (see that function's docstring); this endpoint is what lets
 * `fetch_branches`/`upsert_branch` on the jwantra side give branches
 * their real ClinicKarobar name instead, before any patient/appointment/
 * etc. row referencing that branchId gets synced. */
export function mapBranchToJwantra(b: Branch) {
  return {
    id: b.id,
    name: b.name,
    address: b.address ?? null,
    isActive: b.isActive,
    createdAt: b.createdAt?.toISOString?.() ?? b.createdAt,
    updatedAt: b.updatedAt?.toISOString?.() ?? b.updatedAt,
  };
}

/**
 * These mappers are the contract this module exists to satisfy — field
 * names here must match what app/connectors/clinickarobar.py reads on the
 * Jwantra side (fetch_customers / fetch_products / fetch_orders, plus the
 * Phase 7 healthcare additions: fetch_appointments / fetch_doctors /
 * fetch_inventory_items). Keep the two files in sync if either side's
 * shape changes.
 *
 * branchId: mapPatientToJwantra and mapInvoiceToJwantra now send the
 * row's own `branchId` column. Jwantra's connector already reads this
 * exact key (`_extract_branch_external_id`, checked before `branch_id`/
 * `locationId`) and upserts a matching Branch by external id, falling
 * back to the clinic's default branch when it's null — so this fully
 * closes the loop described in that connector's module docstring, with
 * no Jwantra-side code change required. ClinicService has no branchId
 * column (services are clinic-wide, not branch-scoped), so
 * mapServiceToJwantra intentionally does not send one.
 */

export function mapPatientToJwantra(p: Patient) {
  return {
    id: p.id,
    fullName: p.fullName,
    email: p.email ?? null,
    phoneNumber: p.phone ?? null,
    // dateOfBirth/gender: previously deliberately withheld from this
    // payload ("Phase 7 pipelines read patient-specific fields from
    // raw_payload directly"), but jwantra's dedicated healthcare `Patient`
    // table (app/ingestion/models.py::Patient) has real, typed columns for
    // both and the no-show/recall pipelines benefit from them being
    // structured rather than buried in raw_payload. Sending them here
    // doesn't touch this entity — just exposes two fields it already has.
    dateOfBirth: p.dateOfBirth ?? null,
    gender: p.gender ?? null,
    // Patient.branchId is nullable (NULL = accessible from any branch, see
    // the entity's doc comment) — sent through as-is. Jwantra's connector
    // (connectors/clinickarobar.py::_extract_branch_external_id) reads this
    // exact key and falls back to the clinic's default branch when null,
    // so this is safe to ship even for patients with no home branch set.
    branchId: p.branchId ?? null,
    registeredAt: p.createdAt?.toISOString?.() ?? p.createdAt,
    createdAt: p.createdAt?.toISOString?.() ?? p.createdAt,
    updatedAt: p.updatedAt?.toISOString?.() ?? p.updatedAt,
  };
}

export function mapServiceToJwantra(s: ClinicService) {
  return {
    id: s.id,
    // ClinicService has no branchId column — the service/price list is
    // clinic-wide in ClinicKarobar's schema, not scoped per branch, so
    // there's no per-row branch to send here (unlike patients/invoices
    // below). Jwantra's clinic-level ML analysis already treats a null
    // branch_id as "applies across all branches", which is correct for
    // this data. Add a branchId field here only if ClinicService itself
    // ever gains branch-scoping on this side.
    // ClinicService has no sku/category/cost columns today — sent as null
    // rather than guessed. If those get added to the entity later, wire
    // them through here rather than leaving this connector stale.
    code: null,
    name: s.name,
    category: null,
    price: s.price != null ? Number(s.price) : null,
    cost: null,
    isActive: s.isActive,
    createdAt: s.createdAt?.toISOString?.() ?? s.createdAt,
    updatedAt: s.updatedAt?.toISOString?.() ?? s.updatedAt,
  };
}

const INVOICE_STATUS_TO_JWANTRA: Record<string, string> = {
  paid: 'paid',
  partially_paid: 'partially_paid',
  not_yet_paid: 'unpaid',
  draft: 'unpaid',
  sent: 'unpaid',
  overdue: 'unpaid',
  cancelled: 'void',
  refunded: 'refunded',
};

export function mapInvoiceToJwantra(inv: Invoice) {
  return {
    id: inv.id,
    patientId: inv.patientId ?? null,
    // Same contract as mapPatientToJwantra: pass Invoice.branchId through
    // as-is (nullable for independent-doctor invoices with no clinic/
    // branch), and let Jwantra's connector fall back to the default
    // branch when it's null.
    branchId: inv.branchId ?? null,
    status: INVOICE_STATUS_TO_JWANTRA[inv.status] ?? 'unpaid',
    issuedAt: inv.createdAt?.toISOString?.() ?? inv.createdAt,
    createdAt: inv.createdAt?.toISOString?.() ?? inv.createdAt,
    updatedAt: inv.updatedAt?.toISOString?.() ?? inv.updatedAt,
    subtotal: Number(inv.subtotal ?? 0),
    discount: Number(inv.discountAmount ?? 0),
    // ClinicKarobar splits tax into taxAmount + vatAmount; Jwantra's
    // RawOrder only has a single tax_total field, so the two are combined
    // here rather than dropping vatAmount on the floor.
    tax: Number(inv.taxAmount ?? 0) + Number(inv.vatAmount ?? 0),
    total: Number(inv.total ?? 0),
    currency: 'NPR',
    items: (inv.items ?? []).map((li) => ({
      serviceId: li.serviceId ?? null,
      serviceName: li.description,
      serviceCode: null,
      quantity: Number(li.quantity ?? 1),
      unitPrice: Number(li.unitPrice ?? 0),
      total: Number(li.total ?? 0),
    })),
  };
}

// ── Phase 7 (healthcare) additions ──────────────────────────────────────
// Everything below feeds jwantra's dedicated healthcare tables
// (patients/treatments/appointments/clinic_inventory_items — see
// app/ingestion/models.py on that side) rather than the generic
// customers/products/orders schema the mappers above target. No
// ClinicKarobar entity is changed to support this — each mapper below
// only reshapes fields the underlying entity already has.

const APPOINTMENT_STATUS_TO_JWANTRA: Record<string, string> = {
  scheduled: 'scheduled',
  confirmed: 'scheduled',
  checked_in: 'scheduled',
  in_progress: 'scheduled',
  completed: 'completed',
  cancelled: 'cancelled',
  no_show: 'no_show',
  rescheduled: 'scheduled',
};

export function mapAppointmentToJwantra(a: Appointment) {
  return {
    id: a.id,
    patientId: a.patientId ?? null,
    // Jwantra's connector reads `doctorId` (see fetch_appointments) —
    // Appointment's own column is `dentistId`; `doctorId` is already an
    // alias getter on the entity, exposed here under the name the other
    // side expects rather than renaming anything on this side.
    doctorId: a.dentistId ?? null,
    // Jwantra's Treatment catalog is synced from /services (see
    // fetch_products / mapServiceToJwantra above) and keyed by that same
    // service id, so this is what lets an appointment join back to the
    // treatment it was for.
    treatmentId: a.serviceId ?? null,
    branchId: a.branchId ?? null,
    scheduledAt: a.scheduledAt?.toISOString?.() ?? a.scheduledAt,
    status: APPOINTMENT_STATUS_TO_JWANTRA[a.status] ?? 'scheduled',
    // Only meaningful once the visit is over — left null otherwise, same
    // convention as jwantra's own Appointment.duration_minutes_actual /
    // price_charged columns (see that model's docstring).
    durationMinutesActual: a.status === 'completed' ? a.durationMinutes ?? null : null,
    priceCharged: a.status === 'completed' && a.fee != null ? Number(a.fee) : null,
    createdAt: a.createdAt?.toISOString?.() ?? a.createdAt,
    updatedAt: a.updatedAt?.toISOString?.() ?? a.updatedAt,
  };
}

/** A clinic's doctors/dentists, mapped onto jwantra's generic `Employee`
 * shape (app/ingestion/models.py::Employee) — the same table HR-phase
 * businesses use, reused here as Appointment.doctor_id's target exactly
 * the way that model's docstring says a clinic's doctors should be.
 *
 * `branchId` is resolved by the caller (listDoctors) from the doctor's
 * DoctorClinicAffiliation rows, since a doctor's branch isn't a column
 * on User itself. Passing it through here (rather than hardcoding null)
 * is what lets any branch-scoped read on jwantra's side — e.g.
 * doctor_workload_forecasting when viewing a single branch — actually
 * find this doctor; every other synced entity (patients, invoices,
 * appointments, ...) already carries its real branch_id the same way. */
export function mapDoctorToJwantra(u: User, branchId: string | null = null) {
  return {
    id: u.id,
    fullName: u.fullName,
    role: u.role,
    branchId,
    isActive: u.isActive,
    createdAt: u.createdAt?.toISOString?.() ?? u.createdAt,
  };
}

/** Clinic supply/consumable items, mapped onto jwantra's
 * `ClinicInventoryItem` (app/ingestion/models.py) — deliberately not
 * folded into mapServiceToJwantra's product-catalog output, since these
 * are stocked consumables (gloves, anesthesia, materials), not billable
 * treatments. This is the current-stock snapshot; the consumption
 * *time series* jwantra's `inventory_consumption_prediction` pipeline
 * needs is synced separately via mapInventoryConsumptionToJwantra below
 * (InventoryService.adjustStock now logs one InventoryConsumptionEvent
 * per decrement, instead of only mutating stockQuantity in place). */
export function mapInventoryItemToJwantra(p: Product) {
  return {
    id: p.id,
    name: p.name,
    unit: p.unit ?? null,
    branchId: p.branchId ?? null,
    currentStock: p.stockQuantity,
    // Product carries cost only implicitly via purchase orders, not on
    // the row itself — left null rather than guessed, same discipline
    // mapServiceToJwantra uses for ClinicService's missing cost column.
    unitCost: null,
    createdAt: p.createdAt?.toISOString?.() ?? p.createdAt,
    updatedAt: p.updatedAt?.toISOString?.() ?? p.updatedAt,
  };
}

/** A treatment proposed to a patient, mapped onto jwantra's
 * `TreatmentPlan` (app/ingestion/models.py) — see
 * treatment-plans/entities/treatment-plan-item.entity.ts's docstring for
 * why this is a separate structured entity from
 * ClinicalRecord.treatmentPlan's free-text field. `treatmentId` on the
 * jwantra side joins against the same catalog mapServiceToJwantra syncs
 * (/services), so `serviceId` is sent under that name here. */
export function mapTreatmentPlanToJwantra(tp: TreatmentPlanItem) {
  return {
    id: tp.id,
    patientId: tp.patientId ?? null,
    serviceId: tp.serviceId ?? null,
    appointmentId: tp.appointmentId ?? null,
    branchId: tp.branchId ?? null,
    proposedAt: tp.proposedAt?.toISOString?.() ?? tp.proposedAt,
    priceQuoted: tp.priceQuoted != null ? Number(tp.priceQuoted) : null,
    status: tp.status,
    decidedAt: tp.decidedAt?.toISOString?.() ?? tp.decidedAt ?? null,
    note: tp.note ?? null,
    createdAt: tp.createdAt?.toISOString?.() ?? tp.createdAt,
    updatedAt: tp.updatedAt?.toISOString?.() ?? tp.updatedAt,
  };
}

/** One stock-decrement event, mapped onto jwantra's `InventoryConsumption`
 * (app/ingestion/models.py) — the time-series counterpart to
 * mapInventoryItemToJwantra's point-in-time stock snapshot. `productId`
 * here joins against the same `id` mapInventoryItemToJwantra sends under
 * `/inventory`, since jwantra's connector treats ClinicKarobar's Product
 * rows as its ClinicInventoryItem catalog (see that connector's
 * fetch_inventory_items). */
export function mapInventoryConsumptionToJwantra(e: InventoryConsumptionEvent) {
  return {
    id: e.id,
    productId: e.productId,
    appointmentId: e.appointmentId ?? null,
    branchId: e.branchId ?? null,
    occurredAt: e.occurredAt?.toISOString?.() ?? e.occurredAt,
    quantity: Number(e.quantity ?? 0),
    createdAt: e.createdAt?.toISOString?.() ?? e.createdAt,
  };
}
