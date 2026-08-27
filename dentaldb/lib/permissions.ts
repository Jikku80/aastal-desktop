// dentaldb/lib/permissions.ts
export type Permission =
  | 'dashboard.view'
  | 'queue.view'         | 'queue.manage'
  | 'appointment.view'   | 'appointment.create' | 'appointment.update' | 'appointment.delete'
  | 'patient.view'       | 'patient.create'     | 'patient.update'     | 'patient.delete' | 'patient.record'
  | 'billing.view'       | 'billing.manage'
  | 'invoice.create'     | 'invoice.update'     | 'invoice.delete'
  | 'analytics.view'
  | 'staff.view'         | 'staff.manage'
  | 'branch.view'        | 'branch.manage'
  | 'shift.view'         | 'shift.manage'
  | 'attendance.view'    | 'attendance.manage'
  | 'leave.view'         | 'leave.manage'
  | 'website.view'       | 'website.manage'
  | 'settings.view'      | 'settings.manage'
  | 'roles.view'         | 'roles.manage'
  | 'records.delete'
  | 'inventory.view' | 'inventory.manage'
  | 'services.view'  | 'services.manage'
  | 'records.view'   | 'records.create'  | 'records.update'
  | 'expense.view'    | 'expense.manage'   | 'expense.approve'
  | 'payroll.view'    | 'payroll.manage'   | 'payroll.finalize'
  | 'reports.view'    | 'wallet.manage'
  | 'holiday.view'   | 'holiday.manage'
  | 'notice.view'    | 'notice.manage'
  | 'tasks.view'     | 'tasks.manage'
  | 'lab.view'       | 'lab.manage'       | 'lab.manage_services'
  | 'pharmacy.view' | 'pharmacy.manage_medicines' | 'pharmacy.manage_batches'
  | 'pharmacy.view_expiry' | 'pharmacy.manage_expired_stock' | 'pharmacy.dispense'
  | 'pharmacy.manual_batch_selection' | 'pharmacy.override_batch_restrictions' | 'pharmacy.view_all_branches'
  | 'finance.view_ledger' | 'finance.manage_accounts' | 'finance.post_journal_entry'
  | 'finance.view_statements' | 'finance.close_period'
  | (string & {});

/** Check a flat permissions array (from the store) for a single key. A null/undefined permission means "always allowed" (no gate). */
export function hasPermission(
  permissions: string[] | Set<string> | null | undefined,
  permission: Permission | null | undefined,
): boolean {
  if (!permission) return true;
  if (!permissions) return false;
  if (permissions instanceof Set) return permissions.has(permission);
  return permissions.includes(permission);
}

export function hasAnyPermission(
  permissions: string[] | Set<string> | null | undefined,
  required: Permission[],
): boolean {
  return required.some((p) => hasPermission(permissions, p));
}

export function hasAllPermissions(
  permissions: string[] | Set<string> | null | undefined,
  required: Permission[],
): boolean {
  return required.every((p) => hasPermission(permissions, p));
}

export const NAV_ITEMS = [
  { label: 'Dashboard',    href: '/dashboard',                 icon: 'LayoutDashboard', permission: 'dashboard.view'    as Permission },
  { label: 'Queue',        href: '/dashboard/queue',           icon: 'ListOrdered',     permission: 'appointment.view'  as Permission },
  { label: 'Tasks',        href: '/dashboard/tasks',           icon: 'ClipboardList',   permission: 'tasks.view'        as Permission },
  { label: 'Appointments', href: '/dashboard/appointments',    icon: 'Calendar',        permission: 'appointment.view'  as Permission },
  { label: 'Patients',     href: '/dashboard/patients',        icon: 'Users',           permission: 'patient.view'      as Permission },
  { label: 'Billing',      href: '/dashboard/billing',         icon: 'CreditCard',      permission: 'billing.view'      as Permission },
  { label: 'Expenses',     href: '/dashboard/expenses',        icon: 'Receipt',         permission: 'expense.view'      as Permission },
  { label: 'Payroll',      href: '/dashboard/payroll',         icon: 'DollarSign',      permission: 'payroll.view'      as Permission },
  { label: 'Commissions',  href: '/dashboard/commissions',     icon: 'DollarSign',      permission: 'analytics.view'    as Permission },
  { label: 'Reports',      href: '/dashboard/reports',         icon: 'BarChart3',       permission: 'reports.view'      as Permission },
  { label: 'Finance',      href: '/dashboard/finance',         icon: 'Landmark',        permission: 'finance.view_ledger' as Permission },
  { label: 'Analytics',    href: '/dashboard/analytics',       icon: 'BarChart3',       permission: 'analytics.view'    as Permission },
  { label: 'Jwantra AI',   href: '/dashboard/jwantra-ai',      icon: 'Sparkles',        permission: 'analytics.view'    as Permission },
  { label: 'Staff',        href: '/dashboard/staff',           icon: 'Stethoscope',     permission: 'staff.view'        as Permission },
  // { label: 'Staff Performance', href: '/dashboard/staff-performance', icon: 'Award',     permission: 'analytics.view'    as Permission },
  { label: 'Branches',     href: '/dashboard/branches',        icon: 'GitBranch',       permission: 'branch.view'       as Permission },
  { label: 'Shifts',       href: '/dashboard/shifts',          icon: 'Layers',          permission: 'shift.view'        as Permission },
  { label: 'Attendance',   href: '/dashboard/attendance',      icon: 'ClipboardCheck',  permission: 'attendance.view'   as Permission },
  { label: 'Leave',        href: '/dashboard/leave',           icon: 'CalendarOff',     permission: 'leave.view'     as Permission },
  { label: 'Website',      href: '/website-builder', icon: 'Globe',           permission: 'website.view'      as Permission },
  { label: 'Public Listing', href: '/dashboard/public-listing', icon: 'MapPin',         permission: 'settings.view'     as Permission },
  { label: 'Messages',     href: '/dashboard/messages',        icon: 'MessageSquare',   permission: 'website.view'      as Permission },
  { label: 'SEO',          href: '/dashboard/seo',             icon: 'Globe',           permission: 'website.view'      as Permission },
  { label: 'Roles',        href: '/dashboard/roles',           icon: 'Shield',          permission: 'roles.view'        as Permission },
  { label: 'Services',     href: '/dashboard/services',        icon: 'Package',         permission: 'services.view'     as Permission },
  { label: 'Inventory',    href: '/dashboard/inventory',       icon: 'Archive',         permission: 'inventory.view'    as Permission },
  { label: 'Pharmacy',     href: '/dashboard/pharmacy',        icon: 'Pill',            permission: 'pharmacy.view'     as Permission },
  { label: 'Recalls',      href: '/dashboard/recalls',         icon: 'Bell',            permission: 'appointment.view'  as Permission },
  { label: 'Records',      href: '/dashboard/clinical-records',icon: 'FileText',        permission: 'records.view'      as Permission },
  { label: 'Lab Work',     href: '/dashboard/lab-work',        icon: 'FlaskConical',    permission: 'lab.view'          as Permission },
  { label: 'Holidays',     href: '/dashboard/holidays',        icon: 'CalendarOff',     permission: 'holiday.view'      as Permission },
  { label: 'Audit Log',    href: '/dashboard/audit',           icon: 'ShieldCheck',     permission: 'audit.view'        as Permission },
  { label: 'Settings',     href: '/dashboard/settings',        icon: 'Settings',        permission: 'settings.view'     as Permission },
  // ── Medical Visualization Modules ──────────────────────────────────────
  { label: 'Imaging',      href: '/dashboard/imaging',         icon: 'Layers',          permission: 'records.view'      as Permission },
  { label: 'Dental Chart', href: '/dashboard/dental-chart',    icon: 'Smile',           permission: 'records.view'      as Permission },
  { label: 'Body Diagram', href: '/dashboard/anatomy',         icon: 'User',            permission: 'records.view'      as Permission },
  { label: 'Timeline',     href: '/dashboard/timeline',        icon: 'Activity',        permission: 'records.view'      as Permission },
  { label: 'Health Trends',href: '/dashboard/health-trends',   icon: 'TrendingUp',      permission: 'records.view'      as Permission },
  { label: 'Lab Results',  href: '/dashboard/lab-results',     icon: 'FlaskConical',    permission: 'lab.view'          as Permission },
  { label: 'Clinic Stats', href: '/dashboard/clinic-analytics',icon: 'BarChart2',       permission: 'analytics.view'   as Permission },
  { label: 'Dermatology',  href: '/dashboard/dermatology',     icon: 'ScanLine',        permission: 'records.view'      as Permission },
] as const;

export type NavItem = typeof NAV_ITEMS[number];