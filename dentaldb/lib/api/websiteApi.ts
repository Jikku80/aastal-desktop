// ─── lib/api/websiteApi.ts ─────────────────────────────────────────────────────

import apiClient from '../api';   // 'api' is exported as default
import { publicApi } from '../api'; // publicApi is a named export

// ── Types ─────────────────────────────────────────────────────────────────────
export interface WebsiteSnapshot {
  pages:          any[];
  globalSettings: any;
  theme:          any;
  seo:            any;
}

// ── Auth (dashboard) endpoints ────────────────────────────────────────────────

export const websiteApi = {
  get: () =>
    apiClient.get('/website-builder').then(r => r.data),

  getPreview: () =>
    apiClient.get('/website-builder/preview').then(r => r.data),

  update: (data: Partial<WebsiteSnapshot> & { subdomain?: string; customDomain?: string; isPublished?: boolean }) =>
    apiClient.patch('/website-builder', data).then(r => r.data),

  publish: () =>
    apiClient.post('/website-builder/publish').then(r => r.data),

  unpublish: () =>
    apiClient.post('/website-builder/unpublish').then(r => r.data),

  verifyDomain: () =>
    apiClient.post('/website-builder/verify-domain').then(r => r.data),

  generateAI: (dto: {
    template?:   string;
    tone?:       string;
    specialty?:  string;
    clinicInfo?: string;
  }) => apiClient.post('/website-builder/generate-ai', dto).then(r => r.data),

  generateSection: (dto: {
    pageId:         string;
    sectionId:      string;
    sectionType:    string;
    currentContent?: any;
    userHint?:      string;
  }) => apiClient.post('/website-builder/generate-section', dto).then(r => r.data),

  // ── Pages ──────────────────────────────────────────────────────────────────

  addPage: (page: any) =>
    apiClient.post('/website-builder/pages', page).then(r => r.data),

  deletePage: (pageId: string) =>
    apiClient.delete(`/website-builder/pages/${pageId}`).then(r => r.data),

  reorderPages: (pageIds: string[]) =>
    apiClient.patch('/website-builder/pages/reorder', { pageIds }).then(r => r.data),

  // ── Sections ───────────────────────────────────────────────────────────────

  addSection: (pageId: string, section: any, position?: number) =>
    apiClient.post(`/website-builder/pages/${pageId}/sections`, { section, position }).then(r => r.data),

  updateSection: (pageId: string, sectionId: string, updates: any) =>
    apiClient.patch(`/website-builder/pages/${pageId}/sections/${sectionId}`, updates).then(r => r.data),

  deleteSection: (pageId: string, sectionId: string) =>
    apiClient.delete(`/website-builder/pages/${pageId}/sections/${sectionId}`).then(r => r.data),

  reorderSections: (pageId: string, sectionIds: string[]) =>
    apiClient.patch(`/website-builder/pages/${pageId}/sections/reorder`, { sectionIds }).then(r => r.data),

  duplicateSection: (pageId: string, sectionId: string) =>
    apiClient.post(`/website-builder/pages/${pageId}/sections/${sectionId}/duplicate`).then(r => r.data),

  // ── File uploads ───────────────────────────────────────────────────────────

  /** POST upload an image for use in sections (hero bg, about, etc.) */
  uploadImage: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return apiClient.post('/website-builder/upload-image', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data as { url: string });
  },

  /** POST upload favicon */
  uploadFavicon: (file: File) => {
    const fd = new FormData();
    fd.append('favicon', file);
    return apiClient.post('/website-builder/favicon', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data as { faviconUrl: string });
  },

  // ── Inventory (for builder) ────────────────────────────────────────────────

  /** Fetch all active products for the clinic, grouped with branch info (dashboard/authenticated) */
  getProductsForBuilder: (branchIds?: string[]) => {
    const params: Record<string, string> = { activeOnly: 'true', limit: '500' };
    // If branch filtering is needed we fetch all and filter client-side
    // since the public endpoint handles branch filtering
    return apiClient.get('/inventory', { params }).then(r => r.data);
  },

  /** Fetch products for preview (authenticated, no isPublished requirement) */
  getPreviewProducts: (branchIds?: string[]) => {
    const params: Record<string, string> = {};
    if (branchIds && branchIds.length > 0) {
      params['branchIds'] = branchIds.join(',');
    }
    return apiClient.get('/website-builder/preview/products', { params }).then(r => r.data);
  },

  /** Fetch all clinic branches (dashboard/authenticated) */
  getBranchesForBuilder: () =>
    apiClient.get('/branches').then(r => {
      // branches endpoint returns array or { branches: [] }
      const raw = r.data;
      return Array.isArray(raw) ? raw : (raw.branches || raw.data || raw);
    }),

  // ── Messages ───────────────────────────────────────────────────────────────

  getMessages: (page = 1, limit = 20) =>
    apiClient.get('/website-builder/messages', { params: { page, limit } }).then(r => r.data),

  markMessageRead: (id: string) =>
    apiClient.patch(`/website-builder/messages/${id}/read`).then(r => r.data),

  deleteMessage: (id: string) =>
    apiClient.delete(`/website-builder/messages/${id}`).then(r => r.data),
};

// ── Public endpoints (no auth) ────────────────────────────────────────────────
export const websitePublicApi = {
  get: (subdomain: string) =>
    publicApi.get(`/website-builder/public/${subdomain}`).then(r => r.data),

  getAvailableSlots: (subdomain: string, branchId?: string, doctorId?: string) => {
    const params: Record<string, string> = {};
    if (branchId) params.branchId = branchId;
    if (doctorId) params.doctorId = doctorId;
    return publicApi
      .get(`/website-builder/public/${subdomain}/available-slots`, { params })
      .then(r => r.data);
  },

  getBranches: (subdomain: string) =>
    publicApi.get(`/website-builder/public/${subdomain}/branches`).then(r => r.data),

  getDoctors: (subdomain: string, branchId?: string) => {
    const params: Record<string, string> = {};
    if (branchId) params.branchId = branchId;
    return publicApi
      .get(`/website-builder/public/${subdomain}/doctors`, { params })
      .then(r => r.data);
  },

  getClinicInfo: (subdomain: string) =>
    publicApi.get(`/website-builder/public/${subdomain}/clinic-info`).then(r => r.data),

  getServices: (subdomain: string) =>
    publicApi.get(`/website-builder/public/${subdomain}/services`).then(r => r.data),

  getOpeningHours: (subdomain: string) =>
    publicApi.get(`/website-builder/public/${subdomain}/opening-hours`).then(r => r.data),

  getProducts: (subdomain: string, branchIds?: string) => {
    const params: Record<string, string> = {};
    if (branchIds) params.branchIds = branchIds;
    return publicApi
      .get(`/website-builder/public/${subdomain}/products`, { params })
      .then(r => r.data);
  },

  submitContact: (subdomain: string, dto: {
    name:     string;
    email:    string;
    phone?:   string;
    subject?: string;
    message:  string;
  }) =>
    publicApi.post(`/website-builder/public/${subdomain}/contact`, dto).then(r => r.data),

  book: (subdomain: string, dto: {
    patientName:  string;
    patientPhone: string;
    patientEmail: string;
    doctorId:     string;
    branchId:     string;
    scheduledAt:  string;
    notes?:       string;
  }) =>
    publicApi.post(`/website-builder/public/${subdomain}/book`, dto).then(r => r.data),
};

// ── Notices API ───────────────────────────────────────────────────────────────

export const noticesApi = {
  getMyNotices: (type?: 'notice' | 'holiday') =>
    apiClient.get('/notices', { params: type ? { type } : {} }).then(r => r.data),

  getAllNotices: (type?: 'notice' | 'holiday') =>
    apiClient.get('/notices/all', { params: type ? { type } : {} }).then(r => r.data),

  create: (dto: {
    type:             'notice' | 'holiday';
    title:            string;
    description?:     string;
    startDate?:       string;
    endDate?:         string;
    scope:            'clinic_wide' | 'branch' | 'team_member';
    targetBranchIds?: string[];
    targetUserIds?:   string[];
  }) => apiClient.post('/notices', dto).then(r => r.data),

  update: (id: string, dto: any) =>
    apiClient.patch(`/notices/${id}`, dto).then(r => r.data),

  remove: (id: string) =>
    apiClient.delete(`/notices/${id}`).then(r => r.data),
};

// ── Prescription API ──────────────────────────────────────────────────────────

export const prescriptionApi = {
  download: (clinicId: string, recordId: string) =>
    apiClient.get(`/prescriptions/${recordId}/pdf`, {
      responseType: 'blob',
    }).then(r => {
      const url  = URL.createObjectURL(r.data);
      const link = document.createElement('a');
      link.href  = url;
      link.download = `prescription-${recordId}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    }),

  preview: (recordId: string) =>
    apiClient.get(`/prescriptions/${recordId}/preview`).then(r => r.data),
};

// ── Public products API (no auth, for clinic website) ─────────────────────────

export const publicProductsApi = {
  getProducts: (subdomain: string, branchIds?: string[]) => {
    const params: Record<string, string> = {};
    if (branchIds && branchIds.length > 0) {
      params.branchIds = branchIds.join(',');
    }
    return publicApi.get(`/website-builder/public/${subdomain}/products`, { params }).then(r => r.data);
  },

  placeOrder: (subdomain: string, dto: {
    customerName:    string;
    customerPhone:   string;
    customerAddress: string;
    orderNotes?:     string;
    items: Array<{ productId: string; quantity: number }>;
  }) =>
    publicApi.post(`/website-builder/public/${subdomain}/orders`, dto).then(r => r.data),
};
