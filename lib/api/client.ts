// Typed API client — all requests go through this singleton
// Attaches Clerk JWT automatically; handles errors uniformly

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public data?: any,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function getToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  try {
    // Clerk exposes getToken on the window after auth initialises
    const { default: clerk } = await import('@clerk/nextjs');
    return null; // Will be patched per-call in hooks via useAuth()
  } catch {
    return null;
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: any;
  token?: string | null;
  params?: Record<string, string | number | boolean | undefined>;
  isFormData?: boolean;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token, params, isFormData = false } = options;

  // Build URL with query params
  let url = `${API_BASE}${path}`;
  if (params) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
    });
    const qsStr = qs.toString();
    if (qsStr) url += `?${qsStr}`;
  }

  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!isFormData) headers['Content-Type'] = 'application/json';

  const response = await fetch(url, {
    method,
    headers,
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let errorData: any = {};
    try { errorData = await response.json(); } catch {}
    throw new ApiError(
      response.status,
      errorData.message || `Request failed: ${response.status}`,
      errorData,
    );
  }

  if (response.status === 204) return null as T;
  return response.json();
}

// ── Factory — creates a request function pre-bound to a token ──────────────
export function createApiClient(getToken: () => Promise<string | null>) {
  async function api<T>(path: string, options: Omit<RequestOptions, 'token'> = {}): Promise<T> {
    const token = await getToken();
    return request<T>(path, { ...options, token });
  }

  return {
    // Cases
    cases: {
      list: (p?: any) => api<any>('/cases', { params: p }),
      get: (id: string) => api<any>(`/cases/${id}`),
      create: (body: any) => api<any>('/cases', { method: 'POST', body }),
      bulkImport: (rows: any[]) => api<any>('/cases/bulk', { method: 'POST', body: { rows } }),
      updateStatus: (id: string, body: any) => api<any>(`/cases/${id}/status`, { method: 'PATCH', body }),
      assign: (id: string, body: any) => api<any>(`/cases/${id}/assign`, { method: 'PATCH', body }),
      history: (id: string) => api<any>(`/cases/${id}/history`),
      nearby: (lat: number, lng: number, radius = 10) =>
        api<any>('/cases/nearby', { params: { lat, lng, radius } }),
      startSiteVisit: (id: string, lat: number, lng: number) =>
        api<any>(`/cases/${id}/site-visit/start`, { method: 'POST', body: { lat, lng } }),
      endSiteVisit: (id: string, lat: number, lng: number) =>
        api<any>(`/cases/${id}/site-visit/end`, { method: 'POST', body: { lat, lng } }),
      submitFieldData: (id: string, body: any) =>
        api<any>(`/cases/${id}/field-data`, { method: 'POST', body }),
      uploadPhotos: (id: string, formData: FormData) =>
        api<any>(`/cases/${id}/photos`, { method: 'POST', body: formData, isFormData: true }),
      getReport: (id: string) => api<any>(`/cases/${id}/report`),
      generatePdf: (reportId: string) => api<any>(`/reports/${reportId}/pdf`, { method: 'POST' }),
    },

    // Organizations (banks)
    organizations: {
      list: (p?: any) => api<any>('/organizations', { params: p }),
      get: (id: string) => api<any>(`/organizations/${id}`),
      create: (body: any) => api<any>('/organizations', { method: 'POST', body }),
      branches: (id: string) => api<any>(`/organizations/${id}/branches`),
    },

    // AI Reporting
    ai: {
      startSession: (caseId: string, language?: string) =>
        api<any>('/ai/sessions', { method: 'POST', body: { caseId, language } }),
      sendMessage: (sessionId: string, content: string) =>
        api<any>(`/ai/sessions/${sessionId}/message`, { method: 'POST', body: { content } }),
      generateReport: (sessionId: string) =>
        api<any>(`/ai/sessions/${sessionId}/generate`, { method: 'POST' }),
    },

    // Reports
    reports: {
      get: (id: string) => api<any>(`/reports/${id}`),
      createFromAi: (caseId: string, fields: any) =>
        api<any>('/reports/from-ai', { method: 'POST', body: { caseId, fields } }),
      update: (id: string, body: any) => api<any>(`/reports/${id}`, { method: 'PATCH', body }),
      submit: (id: string) => api<any>(`/reports/${id}/submit`, { method: 'POST' }),
      versions: (caseId: string) => api<any>(`/reports/case/${caseId}/versions`),
    },

    // Report Templates (bank + property-type specific Excel → PDF)
    reportTemplates: {
      list:          (p?: any) => api<any>('/report-templates', { params: p }),
      placeholders:  () => api<any>('/report-templates/placeholders'),
      create:        (body: any) => api<any>('/report-templates', { method: 'POST', body }),
      upload:        (id: string, formData: FormData) =>
        api<any>(`/report-templates/${id}/upload`, { method: 'POST', body: formData, isFormData: true }),
      findForCase:   (caseId: string) => api<any>(`/report-templates/for-case/${caseId}`),
      generatePdf:   (caseId: string) => api<any>(`/report-templates/generate/${caseId}`, { method: 'POST' }),
      delete:        (id: string) => api<any>(`/report-templates/${id}`, { method: 'DELETE' }),
    },

    // Verification
    verification: {
      queue: () => api<any>('/verification/queue'),
      get: (id: string) => api<any>(`/verification/${id}`),
      start: (caseId: string, reportId: string) =>
        api<any>('/verification/start', { method: 'POST', body: { caseId, reportId } }),
      approve: (id: string, comment?: string) =>
        api<any>(`/verification/${id}/approve`, { method: 'POST', body: { comment } }),
      reject: (id: string, comment: string) =>
        api<any>(`/verification/${id}/reject`, { method: 'POST', body: { comment } }),
      requestRevision: (id: string, comment: string) =>
        api<any>(`/verification/${id}/request-revision`, { method: 'POST', body: { comment } }),
      addComment: (id: string, comment: string, fieldKey?: string) =>
        api<any>(`/verification/${id}/comments`, { method: 'POST', body: { comment, fieldKey } }),
    },

    // Employees
    employees: {
      list: (p?: any) => api<any>('/employees', { params: p }),
      get: (id: string) => api<any>(`/employees/${id}`),
      create: (body: any) => api<any>('/employees', { method: 'POST', body }),
      update: (id: string, body: any) => api<any>(`/employees/${id}`, { method: 'PATCH', body }),
      deactivate: (id: string) => api<any>(`/employees/${id}/deactivate`, { method: 'POST' }),
      activate: (id: string) => api<any>(`/employees/${id}/activate`, { method: 'POST' }),
      getCaseCount: (id: string) => api<any>(`/employees/${id}/cases`),
      getAttendance: (id: string, month?: number, year?: number) =>
        api<any>(`/employees/${id}/attendance`, { params: { month, year } }),
      getDocuments: (id: string) => api<any>(`/employees/${id}/documents`),
      uploadDocument: (id: string, formData: FormData) =>
        api<any>(`/employees/${id}/documents`, { method: 'POST', body: formData, isFormData: true }),
      deleteDocument: (id: string, type: string) =>
        api<any>(`/employees/${id}/documents/${type}`, { method: 'DELETE' }),
    },

    // Attendance
    attendance: {
      punchIn: (lat: number, lng: number) =>
        api<any>('/attendance/punch-in', { method: 'POST', body: { lat, lng } }),
      punchOut: (lat: number, lng: number) =>
        api<any>('/attendance/punch-out', { method: 'POST', body: { lat, lng } }),
      today: () => api<any>('/attendance/today'),
      list: (p?: any) => api<any>('/attendance', { params: p }),
    },

    // Billing
    billing: {
      generate: (body: any) => api<any>('/billing/invoices/generate', { method: 'POST', body }),
      invoices: (p?: any) => api<any>('/billing/invoices', { params: p }),
      getInvoice: (id: string) => api<any>(`/billing/invoices/${id}`),
      outstanding: () => api<any>('/billing/invoices/outstanding'),
      recordPayment: (id: string, body: any) =>
        api<any>(`/billing/invoices/${id}/payment`, { method: 'POST', body }),
    },

    // Demolition
    demolition: {
      stats:         () => api<any>('/demolition/stats'),
      zones:         () => api<any>('/demolition/zones'),
      properties:    (p?: any) => api<any>('/demolition/properties', { params: p }),
      alerts:        (p?: any) => api<any>('/demolition/alerts', { params: p }),
      checkAddress:  (body: { address: string; pincode?: string; ownerName?: string }) =>
        api<any>('/demolition/check-address', { method: 'POST', body }),
      matchCase:     (caseId: string) => api<any>(`/demolition/match/${caseId}`, { method: 'POST' }),
      matchAll:      () => api<any>('/demolition/match-all', { method: 'POST' }),
      updateAlert:   (id: string, body: any) =>
        api<any>(`/demolition/alerts/${id}`, { method: 'PATCH', body }),
    },

    // MIS
    mis: {
      snapshot: () => api<any>('/mis/snapshot'),
      bankWise: (p?: any) => api<any>('/mis/bank-wise', { params: p }),
      engineerPerformance: (p?: any) => api<any>('/mis/engineer-performance', { params: p }),
      revenueTrend: (months?: number) => api<any>('/mis/revenue-trend', { params: { months } }),
      tatAnalysis: () => api<any>('/mis/tat-analysis'),
      monthlyCases: (months?: number) => api<any>('/mis/monthly-cases', { params: { months } }),
    },

    // Notifications
    notifications: {
      list: (page?: number) => api<any>('/notifications', { params: { page } }),
      markRead: (id: string) => api<any>(`/notifications/${id}/read`, { method: 'POST' }),
      markAllRead: () => api<any>('/notifications/read-all', { method: 'POST' }),
    },

    // Auth
    auth: {
      me: () => api<any>('/auth/me'),
    },
  };
}

export type AplombApi = ReturnType<typeof createApiClient>;
export { ApiError };
