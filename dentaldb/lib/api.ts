import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// Production API base URL.
// Set NEXT_PUBLIC_API_URL in your deployment environment (.env.production):
//   NEXT_PUBLIC_API_URL=https://app.clinickarobar.com
// The API is served from https://app.clinickarobar.com/api/v1 (the
// originally-planned dedicated api.clinickarobar.com subdomain was never
// stood up — app.* is the real host, same one the frontend itself lives
// on, and the only origin the backend's CORS/routing actually answers on).
// Both frontends (admin + user) must use the same API origin to share cookies.
const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://app.clinickarobar.com'   // ← must match electron/sync-config.js's DEFAULT_REMOTE_BASE_URL
    // Dev fallback must be the BACKEND's port (see dentalDB-backend/src/main.ts,
    // `PORT || 4000`), not this app's own dev port (3002) — pointing at 3002
    // made every unconfigured local dev API call 404 against this Next.js app
    // itself instead of the backend.
    : 'http://localhost:4000');

export const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,   // ← send/receive HTTP-only cookies automatically
});

// ── Auto-refresh on 401 ───────────────────────────────────────────────────────
let isRefreshing = false;
let queue: { resolve: (v: any) => void; reject: (e: any) => void }[] = [];

const flush = (error: any, value?: any) => {
  queue.forEach(p => error ? p.reject(error) : p.resolve(value));
  queue = [];
};

api.interceptors.response.use(
  r => r,
  async (err: AxiosError) => {
    const orig = err.config as any;
    const url: string = orig?.url || '';
    const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/register') ||
      url.includes('/auth/refresh') || url.includes('/auth/logout');

    if (err.response?.status === 401 && !orig._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => queue.push({ resolve, reject }))
          .then(() => api(orig));
      }
      orig._retry = true;
      isRefreshing = true;
      try {
        await api.post('/auth/refresh');   // cookie refreshed server-side
        flush(null);
        return api(orig);
      } catch (refreshErr: any) {
        flush(refreshErr);
        // Only force a redirect to login if the refresh genuinely failed
        // auth (401/403). For rate-limiting (429) or network errors, just
        // reject — redirecting here would cause a reload loop that keeps
        // re-triggering the throttle.
        const status = refreshErr?.response?.status;
        const onAuthPage = typeof window !== 'undefined' &&
          window.location.pathname.startsWith('/auth/');
        if (typeof window !== 'undefined' && (status === 401 || status === 403) && !onAuthPage) {
          window.location.href = '/auth/login';
        }
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(err);
  },
);

// ── Typed API namespaces ──────────────────────────────────────────────────────
export const authApi = {
  login:          (d: { email: string; password: string }) => api.post('/auth/login', d),
  register:       (d: any) => api.post('/auth/register', d),
  logout:         () => api.post('/auth/logout'),
  refresh:        () => api.post('/auth/refresh'),
  me:             () => api.get('/auth/me'),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword:  (token: string, password: string) => api.post('/auth/reset-password', { token, password }),
};

export const patientsApi = {
  list:       (p?: any)              => api.get('/patients', { params: p }),
  get:        (id: string)           => api.get(`/patients/${id}`),
  create:     (d: any)               => api.post('/patients', d),
  update:     (id: string, d: any)   => api.patch(`/patients/${id}`, d),
  delete:     (id: string)           => api.delete(`/patients/${id}`),
  getHistory: (id: string)           => api.get(`/patients/${id}/history`),
};

export const appointmentsApi = {
  list:           (p?: any)            => api.get('/appointments', { params: p }),
  get:            (id: string)         => api.get(`/appointments/${id}`),
  create:         (d: any)             => api.post('/appointments', d),
  update:         (id: string, d: any) => api.patch(`/appointments/${id}`, d),
  cancel:         (id: string, r?: string) => api.patch(`/appointments/${id}/cancel`, { reason: r }),
  complete:       (id: string, d: any) => api.patch(`/appointments/${id}/complete`, d),
  delete:         (id: string)         => api.delete(`/appointments/${id}`),
  suggestSlots:   (d: any)             => api.post('/appointments/suggest-slots', d),
  getCalendar:    (p?: any)            => api.get('/appointments', { params: p }),
};

export const billingApi = {
  listInvoices:    (p?: any)            => api.get('/billing/invoices', { params: p }),
  getInvoice:      (id: string)         => api.get(`/billing/invoices/${id}`),
  createInvoice:   (d: any)             => api.post('/billing/invoices', d),
  updateInvoice:   (id: string, d: any) => api.patch(`/billing/invoices/${id}`, d),
  markPaid:        (id: string, d: any) => api.patch(`/billing/invoices/${id}/pay`, d),
  deleteInvoice:   (id: string)         => api.delete(`/billing/invoices/${id}`),
  getRevenueSummary: (p?: any)          => api.get('/billing/analytics', { params: p }),
  downloadPdf:     (id: string)         => api.get(`/billing/invoices/${id}/pdf`, { responseType: 'blob' }),
};

export const usersApi = {
  listStaff: (p?: any)            => api.get('/users/staff', { params: p }),
  get:       (id: string)         => api.get(`/users/${id}`),
  create:    (d: any)             => api.post('/users', d),
  update:    (id: string, d: any) => api.patch(`/users/${id}`, d),
  deactivate:(id: string)         => api.patch(`/users/${id}/deactivate`),
  reactivate:(id: string)         => api.patch(`/users/${id}/reactivate`),
  deleteStaff:(id: string)        => api.delete(`/users/${id}`),
  getDentistPerformance: (id: string) => api.get(`/users/dentists/${id}/performance`),
  getAdminDentistPerformance: ()  => api.get('/users/admin/dentists/performance'),
  uploadStaffSignature: (id: string, file: File) => {
    const fd = new FormData(); fd.append('file', file);
    return api.post(`/users/${id}/signature`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

export const clinicsApi = {
  getCurrent:         () =>      api.get('/clinics/me'),
  update:             (d: any)  => api.patch('/clinics/me', d),
  updateWorkingHours: (d: any)  => api.patch('/clinics/me/working-hours', d),
  uploadLogo: (file: File) => {
    const fd = new FormData();
    fd.append('logo', file);
    return api.post('/clinics/me/logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

export const subscriptionsApi = {
  getCurrent: ()          => api.get('/subscriptions'),
  getPlans:   ()          => api.get('/subscriptions/plans'),
  upgrade:    (d: any)    => api.post('/subscriptions/upgrade', d),
  renew:      ()          => api.post('/subscriptions/renew'),
  cancel:     ()          => api.delete('/subscriptions/cancel'),
};

export const analyticsApi = {
  getDashboard:       (p?: any) => api.get('/analytics/dashboard', { params: p }),
  getRevenueForecast: (p?: any) => api.get('/analytics/revenue-forecast', { params: p }),
  getAppointmentStats:(p?: any) => api.get('/analytics/appointments', { params: p }),
};

export const paymentsApi = {
  initEsewa:     (d: any)         => api.post('/payments/esewa/init', d),
  verifyEsewa:   (d: any)         => api.post('/payments/esewa/verify', d),
  initKhalti:    (d: any)         => api.post('/payments/khalti/init', d),
  verifyKhalti:  (d: any)         => api.post('/payments/khalti/verify', d),
  createPaypal:  (d: any)         => api.post('/payments/paypal/create-order', d),
  capturePaypal: (orderId: string, invoiceId: string) => api.post(`/payments/paypal/capture/${orderId}`, { invoiceId }),
};

export const websiteApi = {
  get:          () =>      api.get('/website-builder'),
  create:       (d: any)  => api.post('/website-builder', d),
  update:       (d: any)  => api.patch('/website-builder', d),
  publish:      () =>      api.post('/website-builder/publish'),
  unpublish:    () =>      api.post('/website-builder/unpublish'),
  verifyDomain: (domain: string) => api.post('/website-builder/verify-domain', { domain }),
  generateWithAI: (d: any) => api.post('/website-builder/generate', d),
};

// Public website booking API (no auth required)
export const publicWebsiteApi = {
  getAvailableSlots: (subdomain: string) =>
    fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/website-builder/public/${subdomain}/available-slots`).then(r => r.json()),
  bookAppointment: (subdomain: string, d: any) =>
    fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/website-builder/public/${subdomain}/book`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d),
    }).then(r => r.json()),
};

export const filesApi = {
  upload:      (patientId: string, formData: FormData) =>
    api.post(`/files/patients/${patientId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  uploadImage: (formData: FormData) =>
    api.post(`/files/upload-image`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  list:        (patientId: string) => api.get(`/files/patients/${patientId}`),
  // Fetch via axios so the HttpOnly auth cookie is included — direct <img src> / <iframe src> won't send it
  preview:     (id: string) => api.get(`/files/${id}/preview`,  { responseType: 'blob' }),
  download:    (id: string) => api.get(`/files/${id}/download`, { responseType: 'blob' }),
  delete:      (id: string) => api.delete(`/files/${id}`),
};

export const notificationsApi = {
  list:        (limit?: number, branchId?: string) => api.get('/notifications', { params: { limit, branchId } }),
  unreadCount: (branchId?: string) =>               api.get('/notifications/unread-count', { params: { branchId } }),
  markRead:    (id: string) =>                      api.patch(`/notifications/${id}/read`),
  markAllRead: (branchId?: string) =>               api.patch('/notifications/read-all', undefined, { params: { branchId } }),
};

export default api;

export const branchesApi = {
  list:             ()                              => api.get('/branches'),
  myBranches:       ()                              => api.get('/branches/my'),
  get:              (id: string)                    => api.get(`/branches/${id}`),
  getDoctors:       (id: string)                    => api.get(`/branches/${id}/doctors`),
  getStats:         (id: string)                    => api.get(`/branches/${id}/stats`),
  /** Full quota + downgrade-selection status — source of truth for branch management screen. */
  getQuotaStatus:   ()                              => api.get('/branches/quota-status'),
  create:           (d: any)                        => api.post('/branches', d),
  update:           (id: string, d: any)            => api.patch(`/branches/${id}`, d),
  setActive:        (id: string, isActive: boolean) => api.patch(`/branches/${id}`, { isActive }),
  /**
   * Confirm downgrade branch selection.
   * keepIds = branches user chose to keep active (≤ plan quota).
   * Unselected branches become INACTIVE (data preserved, read-only).
   * Replaces the old /branches/set-active endpoint.
   */
  confirmDowngradeSelection: (keepIds: string[]) =>
    api.post('/branches/confirm-downgrade-selection', { keepIds }),
  /** @deprecated Use confirmDowngradeSelection instead */
  setActiveBranches:(keepIds: string[])             => api.post('/branches/confirm-downgrade-selection', { keepIds }),
  remove:           (id: string)                    => api.delete(`/branches/${id}`),
  assignStaff:      (id: string, userId: string)    => api.post(`/branches/${id}/staff/${userId}`),
  removeStaff:      (id: string, userId: string)    => api.delete(`/branches/${id}/staff/${userId}`),
};
export const attendanceApi = {
  checkIn:         () => api.post('/attendance/check-in'),
  checkOut:        () => api.post('/attendance/check-out'),
  today:           () => api.get('/attendance/today'),
  list:            (p?: any) => api.get('/attendance', { params: p }),
  monthlySummary:  (year: number, month: number) => api.get('/attendance/monthly-summary', { params: { year, month } }),
  exportCsv:       (params?: any) => api.get('/attendance/export', { params, responseType: 'blob' }),
};

export const leaveApi = {
  apply:   (d: any)              => api.post('/leave', d),
  list:    (p?: any)             => api.get('/leave', { params: p }),
  approve: (id: string, d?: any) => api.patch(`/leave/${id}/approve`, d),
  reject:  (id: string, d?: any) => api.patch(`/leave/${id}/reject`, d),
  cancel:  (id: string)          => api.patch(`/leave/${id}/cancel`),
};

export const profileApi = {
  getMe:           () => api.get('/users/me'),
  updateMe:        (d: any) => api.patch('/users/me', d),
  uploadAvatar:    (fd: FormData) => api.post('/users/me/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
  uploadSignature: (file: File) => {
    const fd = new FormData(); fd.append('file', file);
    return api.post('/users/me/signature', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

export const vitalsApi = {
  getForAppointment:    (appointmentId: string) => api.get(`/appointments/${appointmentId}/vitals`),
  upsertForAppointment: (appointmentId: string, d: any) => api.post(`/appointments/${appointmentId}/vitals`, d),
  getPatientHistory:    (patientId: string) => api.get(`/patients/${patientId}/vitals-history`),
};

export const billingTemplateApi = {
  get:    () => api.get('/billing/template'),
  update: (d: any) => api.patch('/billing/template', d),
};

export const shiftsApi = {
  // Shifts
  list:           ()                           => api.get('/shifts'),
  create:         (d: any)                     => api.post('/shifts', d),
  update:         (id: string, d: any)         => api.patch(`/shifts/${id}`, d),
  delete:         (id: string)                 => api.delete(`/shifts/${id}`),

  // Patterns (weekly schedule)
  getMySchedule:     ()                        => api.get('/shifts/patterns/me'),
  getUserSchedule:   (userId: string)          => api.get(`/shifts/patterns/users/${userId}`),
  upsertPattern:     (d: any)                  => api.post('/shifts/patterns', d),
  deletePattern:     (id: string)              => api.delete(`/shifts/patterns/${id}`),

  // Assignments (date overrides)
  getUserAssignments: (userId: string, startDate: string, endDate: string) =>
    api.get(`/shifts/assignments/users/${userId}`, { params: { startDate, endDate } }),
  upsertAssignment:  (d: any)                  => api.post('/shifts/assignments', d),
  deleteAssignment:  (id: string)              => api.delete(`/shifts/assignments/${id}`),

  // Resolve
  resolve:        (userId: string, date: string) =>
    api.get('/shifts/resolve', { params: { userId, date } }),
};

// Extended attendanceApi with override
export const attendanceAdminApi = {
  override: (id: string, d: any) => api.patch(`/attendance/${id}/override`, d),
};


// ── API Keys (Enterprise) ───────────────────────────────────────────────────
export const apiKeysApi = {
  getStats:  ()                          => api.get('/api-keys/stats'),
  list:      ()                          => api.get('/api-keys'),
  create:    (d: { name: string; allowedIps?: string; expiresAt?: string }) =>
                                            api.post('/api-keys', d),
  update:    (id: string, d: any)        => api.patch(`/api-keys/${id}`, d),
  revoke:    (id: string)                => api.post(`/api-keys/${id}/revoke`),
  remove:    (id: string)                => api.delete(`/api-keys/${id}`),
};

// ── Super Admin ─────────────────────────────────────────────────────────────
export const adminApi = {
  getDashboard:     ()                             => api.get('/admin/dashboard'),
  getUsers:         (p?: any)                      => api.get('/admin/users', { params: p }),
  getSubscriptions: (p?: any)                      => api.get('/admin/subscription', { params: p }),
  updateSubscription: (clinicId: string, d: any)  => api.patch(`/admin/subscription/${clinicId}`, d),
  getRequests:      (p?: any)                      => api.get('/admin/requests', { params: p }),
  approveRequest:   (id: string, d?: any)          => api.patch(`/admin/requests/${id}/approve`, d),
  rejectRequest:    (id: string, d?: any)          => api.patch(`/admin/requests/${id}/reject`, d),
  // Owner-side
  createRequest:    (d: any)                       => api.post('/admin/subscription-request', d),
  getMyRequests:    ()                             => api.get('/admin/subscription-request/my'),
  deleteUser:       (id: string)                   => api.delete(`/admin/users/${id}`),
  deleteClinic:     (id: string)                   => api.delete(`/admin/clinics/${id}`),
};
export const rbacApi = {
  getMyPermissions: ()                              => api.get('/rbac/me/permissions'),
  getRoles:         ()                              => api.get('/rbac/roles'),
  getRole:          (id: string)                    => api.get(`/rbac/roles/${id}`),
  createRole:       (dto: { name: string; description?: string }) => api.post('/rbac/roles', dto),
  updateRole:       (id: string, dto: any)          => api.put(`/rbac/roles/${id}`, dto),
  deleteRole:       (id: string)                    => api.delete(`/rbac/roles/${id}`),
  setRolePermissions: (id: string, permissionIds: string[]) =>
    api.put(`/rbac/roles/${id}/permissions`, { permissionIds }),
  togglePermission: (roleId: string, permissionId: string, enabled: boolean) =>
    api.patch(`/rbac/roles/${roleId}/permissions/toggle`, { permissionId, enabled }),
  getAllPermissions: ()                              => api.get('/rbac/permissions'),
  getUserRoles:     (userId: string)                => api.get(`/rbac/users/${userId}/roles`),
  assignUserRoles:  (userId: string, roleIds: string[]) =>
    api.put(`/rbac/users/${userId}/roles`, { roleIds }),
};

// ── Services ──────────────────────────────────────────────────────────────────
export const servicesApi = {
  list:   (p?: any)            => api.get('/services', { params: p }),
  get:    (id: string)         => api.get(`/services/${id}`),
  create: (d: any)             => api.post('/services', d),
  update: (id: string, d: any) => api.patch(`/services/${id}`, d),
  delete: (id: string)         => api.delete(`/services/${id}`),
};

// ── Inventory ─────────────────────────────────────────────────────────────────
export const inventoryApi = {
  list:      (p?: any)            => api.get('/inventory', { params: p }),
  get:       (id: string)         => api.get(`/inventory/${id}`),
  create:    (d: any)             => api.post('/inventory', d),
  update:    (id: string, d: any) => api.patch(`/inventory/${id}`, d),
  delete:    (id: string)         => api.delete(`/inventory/${id}`),
  lowStock:  ()                   => api.get('/inventory/low-stock'),
  uploadImage: (id: string, file: File) => {
    const fd = new FormData();
    fd.append('image', file);
    return api.post(`/inventory/${id}/image`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  // Purchase Orders — separate controller at /purchase-orders
  listPOs:   ()                   => api.get('/purchase-orders'),
  createPO:  (d: any)             => api.post('/purchase-orders', d),
  updatePO:  (id: string, d: any) => api.patch(`/purchase-orders/${id}`, d),
  deletePO:  (id: string)         => api.delete(`/purchase-orders/${id}`),
};

// ── Website Orders (orders placed from clinic public website) ─────────────────
export const websiteOrdersApi = {
  list:         (p?: any)                    => api.get("/website-orders", { params: p }),
  updateStatus: (id: string, status: string) => api.patch(`/website-orders/${id}/status`, { status }),
};

// ── Commissions ───────────────────────────────────────────────────────────────
export const commissionsApi = {
  getSummary:    (p?: any) => api.get('/commissions', { params: p }),
  getMonthlyChart: (p?: any) => api.get('/commissions/chart', { params: p }),
};

// ── Clinical Records ──────────────────────────────────────────────────────────
export const clinicalRecordsApi = {
  list:   (p?: any)            => api.get('/clinical-records', { params: p }),
  get:    (id: string)         => api.get(`/clinical-records/${id}`),
  create: (d: any)             => api.post('/clinical-records', d),
  update: (id: string, d: any) => api.patch(`/clinical-records/${id}`, d),
  delete: (id: string)         => api.delete(`/clinical-records/${id}`),
  // Called right after an invoice/billing is created — creates the patient's
  // clinical record if none exists yet, or appends a new dated visit entry
  // (new services, new date/time) to the existing one. No-ops server-side
  // if `services` is empty.
  upsertFromBilling: (d: any)  => api.post('/clinical-records/upsert-from-billing', d),
};

// ── Prescriptions (template + PDF) ────────────────────────────────────────────
const BASE_URL_RAW = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
export const prescriptionsApi = {
  getTemplate:     ()           => api.get('/prescriptions/template'),
  updateTemplate:  (d: any)     => api.patch('/prescriptions/template', d),
  uploadLogo:      (file: File) => {
    const fd = new FormData(); fd.append('file', file);
    return api.post('/prescriptions/template/logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  uploadSignature: (file: File) => {
    const fd = new FormData(); fd.append('file', file);
    return api.post('/prescriptions/template/signature', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  /** URL to fetch prescription PDF for a clinical record */
  recordPdfUrl:         (recordId: string)      => `${BASE_URL_RAW}/api/v1/prescriptions/record/${recordId}/pdf`,
  /** URL to fetch prescription PDF for an appointment */
  appointmentPdfUrl:    (appointmentId: string) => `${BASE_URL_RAW}/api/v1/prescriptions/appointment/${appointmentId}/pdf`,
  /** URL to fetch the preview HTML (used in the modal iframe) */
  recordPreviewHtmlUrl: (recordId: string)      => `${BASE_URL_RAW}/api/v1/prescriptions/record/${recordId}/preview-html`,
};

// ── Waiting Queue ─────────────────────────────────────────────────────────────
export const queueApi = {
  getQueue:            (branchId: string)                    => api.get('/queue', { params: { branchId } }),
  getStats:            (branchId: string)                    => api.get('/queue/stats', { params: { branchId } }),
  searchAppointments:  (branchId: string, q: string)         => api.get('/queue/search-appointments', { params: { branchId, q } }),
  addToQueue:          (branchId: string, d: any)            => api.post('/queue', d, { params: { branchId } }),
  walkIn:              (branchId: string, d: any)            => api.post('/queue/walk-in', d, { params: { branchId } }),
  checkIn:             (branchId: string, appointmentId: string) => api.post(`/queue/check-in/${appointmentId}`, {}, { params: { branchId } }),
  callNext:            (branchId: string, doctorId?: string) => api.patch('/queue/call-next', {}, { params: { branchId, doctorId } }),
  callEntry:           (id: string)                          => api.patch(`/queue/${id}/call`),
  markInProgress:      (id: string)                          => api.patch(`/queue/${id}/in-progress`),
  markDone:            (id: string)                          => api.patch(`/queue/${id}/done`),
  skipEntry:           (id: string)                          => api.patch(`/queue/${id}/skip`),
  update:              (id: string, d: any)                  => api.patch(`/queue/${id}`, d),
  remove:              (id: string)                          => api.delete(`/queue/${id}`),
  /** Idempotent: creates an appointment for a walk-in queue entry. Safe to call multiple times. */
  createAppointmentForEntry: (id: string, d: any)           => api.post(`/queue/${id}/create-appointment`, d),
};
// ── Recalls ───────────────────────────────────────────────────────────────────
export const recallsApi = {
  list:        ()               => api.get('/recalls'),
  stats:       ()               => api.get('/recalls/stats'),
  byPatient:   (patientId: string) => api.get(`/recalls/patient/${patientId}`),
  create:      (d: any)         => api.post('/recalls', d),
  bulkCreate:  (d: any)         => api.post('/recalls/bulk', d),
  update:      (id: string, d: any) => api.patch(`/recalls/${id}`, d),
  delete:      (id: string)     => api.delete(`/recalls/${id}`),
  createAppointment: (id: string, d: any) => api.post(`/recalls/${id}/create-appointment`, d),
  updateAppointmentOutcome: (id: string, outcome: string) => api.patch(`/recalls/${id}/appointment-outcome`, { outcome }),
  sendNow: (id: string) => api.post(`/recalls/${id}/send-now`),
};

// ── Audit Logs ────────────────────────────────────────────────────────────────
export const auditApi = {
  list: (params?: {
    userId?: string;
    entityType?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => api.get('/audit-logs', { params }),
};

// ── Holidays ──────────────────────────────────────────────────────────────────
export const holidaysApi = {
  list:    (p?: { branchId?: string }) => api.get('/holidays', { params: p }),
  create:  (d: any)                    => api.post('/holidays', d),
  update:  (id: string, d: any)        => api.patch(`/holidays/${id}`, d),
  delete:  (id: string)                => api.delete(`/holidays/${id}`),
};

// ── Notices ───────────────────────────────────────────────────────────────────
export const noticesApi = {
  list:    (p?: { branchId?: string }) => api.get('/notices', { params: p }),
  create:  (d: any)                    => api.post('/notices', d),
  update:  (id: string, d: any)        => api.patch(`/notices/${id}`, d),
  delete:  (id: string)                => api.delete(`/notices/${id}`),
};

// ── Lab Work ──────────────────────────────────────────────────────────────────
export const labApi = {
  list:          (p?: any)             => api.get('/lab-work', { params: p }),
  get:           (id: string)          => api.get(`/lab-work/${id}`),
  stats:         ()                    => api.get('/lab-work/stats'),
  byPatient:     (patientId: string)   => api.get(`/lab-work/patient/${patientId}`),
  unbilledByPatient: (patientId: string) => api.get(`/lab-work/patient/${patientId}/unbilled`),
  create:        (d: any)              => api.post('/lab-work', d),
  update:        (id: string, d: any)  => api.patch(`/lab-work/${id}`, d),
  delete:        (id: string)          => api.delete(`/lab-work/${id}`),
};

// ── Blood Test ────────────────────────────────────────────────────────────────
export const bloodTestApi = {
  list:          (p?: any)             => api.get('/blood-test', { params: p }),
  get:           (id: string)          => api.get(`/blood-test/${id}`),
  stats:         ()                    => api.get('/blood-test/stats'),
  byPatient:     (patientId: string)   => api.get(`/blood-test/patient/${patientId}`),
  unbilledByPatient: (patientId: string) => api.get(`/blood-test/patient/${patientId}/unbilled`),
  create:        (d: any)              => api.post('/blood-test', d),
  update:        (id: string, d: any)  => api.patch(`/blood-test/${id}`, d),
  delete:        (id: string)          => api.delete(`/blood-test/${id}`),
};

export const publicApi = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  // no withCredentials — these are unauthenticated public routes
});

// ── Expenses ──────────────────────────────────────────────────────────────────
export const expenseApi = {
  list:           (p?: any) => api.get('/expenses', { params: p }),
  create:         (d: any)  => api.post('/expenses', d),
  update:         (id: string, d: any) => api.patch(`/expenses/${id}`, d),
  delete:         (id: string) => api.delete(`/expenses/${id}`),
  approve:        (id: string, status = 'approved') => api.patch(`/expenses/${id}/approve`, { status }),
  getSummary:     (p?: any) => api.get('/expenses/summary', { params: p }),
  getMonthlyTrend:(p?: any) => api.get('/expenses/monthly-trend', { params: p }),
  listVendors:    (p?: any) => api.get('/expenses/vendors', { params: p }),
  createVendor:   (d: any)  => api.post('/expenses/vendors', d),
  updateVendor:   (id: string, d: any) => api.patch(`/expenses/vendors/${id}`, d),
  deleteVendor:   (id: string) => api.delete(`/expenses/vendors/${id}`),
};

// ── Payroll ───────────────────────────────────────────────────────────────────
export const payrollApi = {
  list:               (p?: any)   => api.get('/payroll', { params: p }),
  calculate:          (d: any)    => api.post('/payroll/calculate', d),
  getRun:             (runId: string) => api.get(`/payroll/${runId}`),
  finalize:           (runId: string) => api.patch(`/payroll/${runId}/finalize`),
  markPaid:           (runId: string) => api.patch(`/payroll/${runId}/paid`),
  payslip:            (runId: string, entryId: string) =>
    api.get(`/payroll/${runId}/entries/${entryId}/payslip`, { responseType: 'blob' }),
  // FIX #3: per-entry deduction editing
  updateEntry:        (runId: string, entryId: string, d: any) =>
    api.patch(`/payroll/${runId}/entries/${entryId}`, d),
  // FIX #6: deduction rules
  getDeductionRules:  () => api.get('/payroll/deduction-rules'),
  saveDeductionRules: (d: any) => api.patch('/payroll/deduction-rules', d),
};

// ── Wallet ────────────────────────────────────────────────────────────────────
export const walletApi = {
  getBalance:     (patientId: string) => api.get(`/patient-wallet/${patientId}`),
  getTransactions:(patientId: string, p?: any) => api.get(`/patient-wallet/${patientId}/transactions`, { params: p }),
  credit:         (patientId: string, d: any) => api.post(`/patient-wallet/${patientId}/credit`, d),
  applyToInvoice: (patientId: string, d: any) => api.post(`/patient-wallet/${patientId}/apply-to-invoice`, d),
};

// ── Financial Reports ─────────────────────────────────────────────────────────
export const reportsApi = {
  getProfitLoss:          (p?: any) => api.get('/analytics/profit-loss', { params: p }),
  getCashFlow:            (p?: any) => api.get('/analytics/cash-flow', { params: p }),
  getRevenueByDoctor:     (p?: any) => api.get('/analytics/revenue-by-doctor', { params: p }),
  getRevenueByService:    (p?: any) => api.get('/analytics/revenue-by-service', { params: p }),
  getOutstandingReceivables: (p?: any) => api.get('/analytics/outstanding-receivables', { params: p }),
  getBranchPerformance:   (p?: any) => api.get('/analytics/branch-performance', { params: p }),
  getTaxReport:           (p?: any) => api.get('/analytics/tax-report', { params: p }),
  getAgingReport:         (p?: any) => api.get('/billing/aging-report', { params: p }),
};

// ── Blog (admin) ──────────────────────────────────────────────────────────────
export const blogApi = {
  list:               (p?: any)            => api.get('/blog', { params: p }),
  get:                (id: string)         => api.get(`/blog/${id}`),
  create:             (d: any)             => api.post('/blog', d),
  update:             (id: string, d: any) => api.patch(`/blog/${id}`, d),
  delete:             (id: string)         => api.delete(`/blog/${id}`),
  seoHealth:          ()                   => api.get('/blog/seo-health'),
  categories:         ()                   => api.get('/blog/categories'),
  tags:               ()                   => api.get('/blog/tags'),
  linkSuggestions:    (id: string)         => api.get(`/blog/${id}/link-suggestions`),
};

// ── SEO ───────────────────────────────────────────────────────────────────────
export const seoApi = {
  // Redirects
  listRedirects:      ()                                          => api.get('/seo/redirects'),
  createRedirect:     (d: any)                                    => api.post('/seo/redirects', d),
  deleteRedirect:     (id: string)                                => api.delete(`/seo/redirects/${id}`),
  // Per-identifier public-ish endpoints (still authed in dashboard context)
  getSchema:          (identifier: string)                        => api.get(`/seo/${identifier}/schema.json`),
  getAiSuggestions:   (identifier: string)                        => api.get(`/seo/${identifier}/ai-suggestions`),
};

// ── Tasks ─────────────────────────────────────────────────────────────────────
export const tasksApi = {
  list:         (p?: any)            => api.get('/tasks', { params: p }),
  myTasks:      (branchId?: string)  => api.get('/tasks/my', { params: { branchId } }),
  stats:        ()                   => api.get('/tasks/stats'),
  get:          (id: string)         => api.get(`/tasks/${id}`),
  create:       (d: any)             => api.post('/tasks', d),
  update:       (id: string, d: any) => api.patch(`/tasks/${id}`, d),
  updateStatus: (id: string, d: any) => api.patch(`/tasks/${id}/status`, d),
  delete:       (id: string)         => api.delete(`/tasks/${id}`),
};
// ── Doctor Affiliations (Part 8) ──────────────────────────────────────────────
export const affiliationsApi = {
  list:         (clinicId: string)                       => api.get(`/doctor-affiliations/clinic/${clinicId}`),
  invite:       (clinicId: string, d: any)               => api.post(`/doctor-affiliations/clinic/${clinicId}/invite`, d),
  accept:       (id: string, doctorUserId: string)       => api.patch(`/doctor-affiliations/${id}/accept`, { doctorUserId }),
  decline:      (id: string, doctorUserId: string)       => api.patch(`/doctor-affiliations/${id}/decline`, { doctorUserId }),
  suspend:      (id: string, clinicId: string)           => api.patch(`/doctor-affiliations/${id}/suspend`, { clinicId }),
  remove:       (id: string, clinicId: string)           => api.patch(`/doctor-affiliations/${id}/remove`, { clinicId }),
};

// ── Doctor Profile (Part 9) ───────────────────────────────────────────────────
export const doctorProfileApi = {
  get:              (userId: string)        => api.get(`/doctor/profile/${userId}`),
  update:           (userId: string, d: any) => api.patch(`/doctor/profile/${userId}`, d),
  heartbeat:        (userId: string)        => api.post(`/doctor/profile/${userId}/heartbeat`),
  getLocations:     (userId: string)        => api.get(`/doctor/${userId}/locations`),
  addLocation:      (userId: string, d: any) => api.post(`/doctor/${userId}/locations`, d),
  removeLocation:   (userId: string, id: string) => api.delete(`/doctor/${userId}/locations/${id}`),
  getAvailability:  (userId: string)        => api.get(`/doctor/${userId}/availability`),
  setAvailability:  (userId: string, slots: any[]) => api.post(`/doctor/${userId}/availability`, { slots }),
  getPendingInvites:(userId: string)        => api.get(`/doctor-affiliations/clinic/invites?doctorUserId=${userId}`),
};

// ── Public Listing Settings (Part 1) ─────────────────────────────────────────
export const listingApi = {
  getSettings:  ()       => api.get('/clinics/me'),
  updateListing:(d: any) => api.patch('/clinics/me', d),
};

// Re-export from websiteApi for callers that previously used '@/lib/api/websiteApi'
export { websiteApi as websiteApiAlt } from './api/websiteApi';

// ── Sync / Offline status (Phase 5) ──────────────────────────────────────────
// On a normal online (Postgres) deployment, /sync/status still responds —
// isOnline is just always true and outbox counts are always zero, so this
// is safe to poll unconditionally rather than needing an "are we in
// Electron" check on the frontend.
export const syncApi = {
  status: () => api.get('/sync/status'),
  trigger: () => api.post('/sync/trigger'),
  // Admin-only (OWNER/SUPER_ADMIN) — see SyncController.listDevices/revokeDevice.
  devices: () => api.get('/sync/devices'),
  revokeDevice: (id: string) => api.post(`/sync/devices/${id}/revoke`),
};

export const outboxApi = {
  status: () => api.get('/outbox/status'),
  pending: () => api.get('/outbox/pending'),
  drain: () => api.post('/outbox/drain'),
};
