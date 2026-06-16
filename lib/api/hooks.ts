// React Query hooks — all data fetching goes through these
// Each hook is self-contained: loads auth token, calls API, returns typed data

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { createApiClient } from './client';
import { toast } from 'sonner';

// ── Hook factory ─────────────────────────────────────────────
export function useApi() {
  const { getToken } = useAuth();
  return createApiClient(() => getToken());
}

// ── Cases ─────────────────────────────────────────────────────
export function useCases(filters?: {
  page?: number; limit?: number; search?: string; status?: string;
  organizationId?: string; engineerId?: string; priority?: string;
  from?: string; to?: string;
  sortBy?: string; sortOrder?: 'asc' | 'desc';
}) {
  const api = useApi();
  return useQuery({
    queryKey: ['cases', filters],
    queryFn: () => api.cases.list(filters),
    staleTime: 30_000,
  });
}

export function useCase(id: string) {
  const api = useApi();
  return useQuery({
    queryKey: ['case', id],
    queryFn: () => api.cases.get(id),
    enabled: !!id,
    staleTime: 15_000,
  });
}

export function useCaseHistory(id: string) {
  const api = useApi();
  return useQuery({
    queryKey: ['case-history', id],
    queryFn: () => api.cases.history(id),
    enabled: !!id,
  });
}

export function useCreateCase() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: any) => api.cases.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cases'] });
      toast.success('Case created successfully');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateCaseStatus() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; status: string; reason?: string }) =>
      api.cases.updateStatus(id, body),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['case', id] });
      qc.invalidateQueries({ queryKey: ['cases'] });
      toast.success('Status updated');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useAssignCase() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; engineerId?: string; verifierId?: string }) =>
      api.cases.assign(id, body),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['case', id] });
      qc.invalidateQueries({ queryKey: ['cases'] });
      toast.success('Case assigned');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useNearbyCases(lat?: number, lng?: number) {
  const api = useApi();
  return useQuery({
    queryKey: ['cases-nearby', lat, lng],
    queryFn: () => api.cases.nearby(lat!, lng!),
    enabled: !!lat && !!lng,
    staleTime: 60_000,
  });
}

// ── Organizations ─────────────────────────────────────────────
export function useOrganizations(params?: { search?: string; limit?: number }) {
  const api = useApi();
  // Fetch page 1 and page 2 in parallel to get up to 40 orgs without passing
  // a string limit (which causes a Prisma validation error on the backend).
  const q1 = useQuery({
    queryKey: ['organizations', 'p1', params?.search],
    queryFn: () => api.organizations.list({ search: params?.search, page: 1 }),
    staleTime: 300_000,
  });
  const q2 = useQuery({
    queryKey: ['organizations', 'p2', params?.search],
    queryFn: () => api.organizations.list({ search: params?.search, page: 2 }),
    staleTime: 300_000,
    enabled: (q1.data?.total ?? 0) > 20,
  });
  const page1: any[] = q1.data?.data ?? [];
  const page2: any[] = q2.data?.data ?? [];
  const merged = [...page1, ...page2];
  return {
    data: { data: merged, total: q1.data?.total ?? 0 },
    isLoading: q1.isLoading,
    error: q1.error,
  };
}

export function useBankBranches(organizationId: string | undefined) {
  const api = useApi();
  return useQuery({
    queryKey: ['bank-branches', organizationId],
    queryFn: () => api.organizations.branches(organizationId!),
    enabled: !!organizationId,
    staleTime: 300_000,
  });
}

// ── AI Reporting ──────────────────────────────────────────────
export function useStartAiSession() {
  const api = useApi();
  return useMutation({
    mutationFn: ({ caseId, language }: { caseId: string; language?: string }) =>
      api.ai.startSession(caseId, language),
    onError: (e: any) => toast.error(e.message),
  });
}

export function useSendAiMessage() {
  const api = useApi();
  return useMutation({
    mutationFn: ({ sessionId, content }: { sessionId: string; content: string }) =>
      api.ai.sendMessage(sessionId, content),
    onError: (e: any) => toast.error(e.message),
  });
}

export function useGenerateReport() {
  const api = useApi();
  return useMutation({
    mutationFn: (sessionId: string) => api.ai.generateReport(sessionId),
    onSuccess: () => {
      toast.success('Report generated from AI session!');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ── Reports ───────────────────────────────────────────────────
export function useReport(id: string) {
  const api = useApi();
  return useQuery({
    queryKey: ['report', id],
    queryFn: () => api.reports.get(id),
    enabled: !!id,
  });
}

export function useSubmitReport() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.reports.submit(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cases'] });
      toast.success('Report submitted for verification');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ── Verification ──────────────────────────────────────────────
export function useVerificationQueue() {
  const api = useApi();
  return useQuery({
    queryKey: ['verification-queue'],
    queryFn: () => api.verification.queue(),
    refetchInterval: 30_000,
  });
}

export function useVerification(id: string) {
  const api = useApi();
  return useQuery({
    queryKey: ['verification', id],
    queryFn: () => api.verification.get(id),
    enabled: !!id,
  });
}

export function useApproveReport() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) =>
      api.verification.approve(id, comment),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['verification-queue'] });
      toast.success('Report approved');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useRejectReport() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, comment }: { id: string; comment: string }) =>
      api.verification.reject(id, comment),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['verification-queue'] });
      toast.error('Report rejected');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ── Employees ─────────────────────────────────────────────────
export function useEmployees(query?: any) {
  const api = useApi();
  return useQuery({
    queryKey: ['employees', query],
    queryFn: () => api.employees.list(query),
    staleTime: 60_000,
  });
}

export function useEmployee(id: string) {
  const api = useApi();
  return useQuery({
    queryKey: ['employee', id],
    queryFn: () => api.employees.get(id),
    enabled: !!id,
  });
}

export function useEmployeeCaseCount(userId: string) {
  const api = useApi();
  return useQuery({
    queryKey: ['employee-cases', userId],
    queryFn: () => api.employees.getCaseCount(userId),
    enabled: !!userId,
    staleTime: 60_000,
  });
}

export function useCreateEmployee() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: any) => api.employees.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Employee added successfully');
    },
    onError: (e: any) => toast.error(e.message ?? 'Failed to add employee'),
  });
}

export function useUpdateEmployee() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; [k: string]: any }) =>
      api.employees.update(id, body),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['employee', id] });
      qc.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Employee updated');
    },
    onError: (e: any) => toast.error(e.message ?? 'Failed to update employee'),
  });
}

export function useEmployeeDocuments(id: string) {
  const api = useApi()
  return useQuery({
    queryKey: ['employee-documents', id],
    queryFn: () => api.employees.getDocuments(id),
    enabled: !!id,
    staleTime: 30_000,
  })
}

export function useUploadEmployeeDocument() {
  const api = useApi()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, type, file }: { id: string; type: string; file: File }) => {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('type', type)
      return api.employees.uploadDocument(id, fd)
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['employee-documents', id] })
      qc.invalidateQueries({ queryKey: ['employee', id] })
      toast.success('Document uploaded')
    },
    onError: (e: any) => toast.error(e.message ?? 'Upload failed'),
  })
}

export function useDeleteEmployeeDocument() {
  const api = useApi()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, type }: { id: string; type: string }) =>
      api.employees.deleteDocument(id, type),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['employee-documents', id] })
      toast.success('Document removed')
    },
    onError: (e: any) => toast.error(e.message),
  })
}

export function useToggleEmployeeStatus() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      active ? api.employees.activate(id) : api.employees.deactivate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      qc.invalidateQueries({ queryKey: ['employee'] });
      toast.success('Status updated');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ── Attendance ────────────────────────────────────────────────
export function useTodayAttendance() {
  const api = useApi();
  return useQuery({
    queryKey: ['attendance-today'],
    queryFn: () => api.attendance.today(),
    staleTime: 10_000,
  });
}

export function usePunchIn() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ lat, lng }: { lat: number; lng: number }) => api.attendance.punchIn(lat, lng),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['attendance-today'] });
      if (data.isWithinGeofence) {
        toast.success(`Punched in ✓ (${data.distanceFromOffice}m from office)`);
      } else {
        toast.warning(`Punched in — outside geofence (${data.distanceFromOffice}m from office)`);
      }
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function usePunchOut() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ lat, lng }: { lat: number; lng: number }) => api.attendance.punchOut(lat, lng),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance-today'] });
      toast.success('Punched out successfully');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ── Demolition ────────────────────────────────────────────────
export function useDemolitionStats() {
  const api = useApi()
  return useQuery({
    queryKey: ['demolition-stats'],
    queryFn: () => api.demolition.stats(),
    staleTime: 120_000,
  })
}

export function useDemolitionZones() {
  const api = useApi()
  return useQuery({
    queryKey: ['demolition-zones'],
    queryFn: () => api.demolition.zones(),
    staleTime: 600_000,
  })
}

export function useDemolitionProperties(params?: {
  search?: string; zone?: string; page?: number; limit?: number
}) {
  const api = useApi()
  return useQuery({
    queryKey: ['demolition-properties', params],
    queryFn: () => api.demolition.properties(params),
    staleTime: 60_000,
  })
}

export function useDemolitionAlerts(params?: {
  status?: string; page?: number; limit?: number
}) {
  const api = useApi()
  return useQuery({
    queryKey: ['demolition-alerts', params],
    queryFn: () => api.demolition.alerts(params),
    staleTime: 30_000,
  })
}

export function useMatchDemolitionCase() {
  const api = useApi()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (caseId: string) => api.demolition.matchCase(caseId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['demolition-alerts'] })
      qc.invalidateQueries({ queryKey: ['demolition-stats'] })
      toast.success('Cross-match complete')
    },
    onError: (e: any) => toast.error(e.message),
  })
}

export function useMatchAllDemolition() {
  const api = useApi()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.demolition.matchAll(),
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['demolition-alerts'] })
      qc.invalidateQueries({ queryKey: ['demolition-stats'] })
      toast.success(`Scanned ${data.processed} cases, found ${data.newAlerts} alerts`)
    },
    onError: (e: any) => toast.error(e.message),
  })
}

export function useUpdateDemolitionAlert() {
  const api = useApi()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; status: 'CONFIRMED' | 'DISMISSED'; reason?: string }) =>
      api.demolition.updateAlert(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['demolition-alerts'] })
      qc.invalidateQueries({ queryKey: ['demolition-stats'] })
    },
    onError: (e: any) => toast.error(e.message),
  })
}

// ── MIS Dashboard ─────────────────────────────────────────────
export function useMisSnapshot() {
  const api = useApi();
  return useQuery({
    queryKey: ['mis-snapshot'],
    queryFn: () => api.mis.snapshot(),
    refetchInterval: 30_000,
    staleTime: 10_000,
  });
}

export function useRevenueTrend(months = 6) {
  const api = useApi();
  return useQuery({
    queryKey: ['revenue-trend', months],
    queryFn: () => api.mis.revenueTrend(months),
    staleTime: 300_000,
  });
}

export function useBankWiseMis(from?: string, to?: string) {
  const api = useApi();
  return useQuery({
    queryKey: ['bank-wise', from, to],
    queryFn: () => api.mis.bankWise({ from, to }),
    staleTime: 60_000,
  });
}

export function useEngineerPerformance(from?: string, to?: string) {
  const api = useApi();
  return useQuery({
    queryKey: ['engineer-performance', from, to],
    queryFn: () => api.mis.engineerPerformance({ from, to }),
    staleTime: 60_000,
  });
}

export function useTatAnalysis() {
  const api = useApi();
  return useQuery({
    queryKey: ['tat-analysis'],
    queryFn: () => api.mis.tatAnalysis(),
    staleTime: 300_000,
  });
}

export function useMonthlyCases(months = 12) {
  const api = useApi();
  return useQuery({
    queryKey: ['monthly-cases', months],
    queryFn: () => api.mis.monthlyCases(months),
    staleTime: 300_000,
  });
}

// ── Billing ───────────────────────────────────────────────────
export function useInvoices(query?: any) {
  const api = useApi();
  return useQuery({
    queryKey: ['invoices', query],
    queryFn: () => api.billing.invoices(query),
    staleTime: 60_000,
  });
}

export function useGenerateInvoice() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { organizationId: string; periodStart: string; periodEnd: string }) =>
      api.billing.generate(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice generated successfully');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// ── Notifications ─────────────────────────────────────────────
export function useNotifications(page = 1) {
  const api = useApi();
  return useQuery({
    queryKey: ['notifications', page],
    queryFn: () => api.notifications.list(page),
    refetchInterval: 30_000,
  });
}

export function useAttendanceList(params?: { date?: string; employeeId?: string }) {
  const api = useApi();
  return useQuery({
    queryKey: ['attendance-list', params],
    queryFn: () => api.attendance.list(params),
    staleTime: 30_000,
  });
}

export function useMarkNotificationRead() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.notifications.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}
