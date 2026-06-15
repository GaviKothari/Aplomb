'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Download,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Search,
  X,
  BarChart3,
} from 'lucide-react'
import { useMisSnapshot, useCases, useOrganizations } from '@/lib/api/hooks'
import { useAuth } from '@clerk/nextjs'
import { createApiClient } from '@/lib/api/client'

// Parse "Market Value: ₹36,699,110 | ..." → raw number
function parseMarketValue(notes: string | null | undefined): number | null {
  if (!notes) return null
  const m = notes.match(/Market Value:\s*₹([\d,]+)/)
  if (!m) return null
  return parseInt(m[1].replace(/,/g, ''), 10)
}

function formatINR(n: number | null): string {
  if (n === null || n === 0) return '—'
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)} Cr`
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(2)} L`
  return `₹${n.toLocaleString('en-IN')}`
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  NEW:                   { label: 'New',             cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  ASSIGNED:              { label: 'Assigned',        cls: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
  SITE_VISIT_SCHEDULED:  { label: 'Visit Scheduled', cls: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200' },
  SITE_VISIT_IN_PROGRESS:{ label: 'Visit Active',    cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' },
  SITE_VISIT_COMPLETED:  { label: 'Visit Done',      cls: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
  UNDER_VERIFICATION:    { label: 'Verification',    cls: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
  REVISION_REQUESTED:    { label: 'Revision',        cls: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
  FINALIZED:             { label: 'Finalized',       cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' },
  SENT_TO_BANK:          { label: 'Sent to Bank',    cls: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  ON_HOLD:               { label: 'On Hold',         cls: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  CLOSED:                { label: 'Closed',          cls: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
}

type SortField = 'createdAt' | 'ownerName' | 'status' | 'branchName' | 'caseNumber'

const PAGE_SIZE = 50

function StatCard({ label, value, icon: Icon, colorClass }: {
  label: string; value: number; icon: any; colorClass: string
}) {
  return (
    <div className={`p-4 rounded-lg border ${colorClass}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Icon className="w-4 h-4 opacity-60" />
      </div>
      <div className="text-2xl font-bold">{value.toLocaleString()}</div>
    </div>
  )
}

export default function MISDashboardPage() {
  const router = useRouter()
  const { getToken } = useAuth()

  const [search, setSearch] = useState('')
  const [bankId, setBankId] = useState('all')
  const [status, setStatus] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState<SortField>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [exporting, setExporting] = useState(false)

  const filters = useMemo(() => ({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    organizationId: bankId !== 'all' ? bankId : undefined,
    status: status !== 'all' ? status : undefined,
    from: fromDate || undefined,
    to: toDate || undefined,
    sortBy,
    sortOrder,
  }), [page, search, bankId, status, fromDate, toDate, sortBy, sortOrder])

  const { data: snapshot, isLoading: snapLoading, refetch: refetchSnap } = useMisSnapshot()
  const { data: casesData, isLoading: casesLoading, refetch: refetchCases } = useCases(filters)
  const { data: orgsData } = useOrganizations({ limit: 200 })

  const cases: any[] = casesData?.data ?? []
  const total: number = casesData?.total ?? 0
  const totalPages: number = casesData?.totalPages ?? 1
  const orgs: any[] = Array.isArray(orgsData) ? orgsData : (orgsData?.data ?? [])

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
    setPage(1)
  }

  const resetFilters = () => {
    setSearch('')
    setBankId('all')
    setStatus('all')
    setFromDate('')
    setToDate('')
    setPage(1)
    setSortBy('createdAt')
    setSortOrder('desc')
  }

  const hasActiveFilter = search || bankId !== 'all' || status !== 'all' || fromDate || toDate

  const exportCSV = useCallback(async () => {
    setExporting(true)
    try {
      const api = createApiClient(() => getToken())
      const allData = await api.cases.list({
        limit: 9999,
        search: search || undefined,
        organizationId: bankId !== 'all' ? bankId : undefined,
        status: status !== 'all' ? status : undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
        sortBy,
        sortOrder,
      })
      const rows: any[] = allData?.data ?? []
      const headers = ['S.No', 'Date', 'Case Ref', 'Loan Account', 'Borrower Name', 'Bank', 'Branch', 'Market Value (₹)', 'Property Type', 'Address', 'Pincode', 'Engineer', 'Status']
      const csv = [
        headers.join(','),
        ...rows.map((c: any, i: number) => {
          const mv = parseMarketValue(c.notes)
          return [
            i + 1,
            c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-IN') : '',
            c.caseNumber ?? '',
            c.loanAccountNumber ?? '',
            c.ownerName ?? '',
            c.organization?.name ?? '',
            c.branchName ?? '',
            mv ?? '',
            c.propertyType ?? '',
            `"${(c.propertyAddress ?? '').replace(/"/g, '""')}"`,
            c.propertyPincode ?? '',
            c.engineer?.name ?? '',
            STATUS_META[c.status]?.label ?? c.status ?? '',
          ].join(',')
        }),
      ].join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `aplomb-mis-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }, [getToken, search, bankId, status, fromDate, toDate, sortBy, sortOrder])

  function SortIcon({ field }: { field: SortField }) {
    if (sortBy !== field) return <ChevronsUpDown className="inline w-3 h-3 ml-1 text-muted-foreground/60" />
    return sortOrder === 'asc'
      ? <ChevronUp className="inline w-3 h-3 ml-1 text-primary" />
      : <ChevronDown className="inline w-3 h-3 ml-1 text-primary" />
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">MIS Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              {casesLoading ? 'Loading...' : `${total.toLocaleString()} cases`}
              {hasActiveFilter ? ' (filtered)' : ' across all banks'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => { refetchSnap(); refetchCases() }}
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={exportCSV}
              disabled={exporting || casesLoading}
            >
              <Download className={`w-4 h-4 ${exporting ? 'animate-bounce' : ''}`} />
              {exporting ? 'Exporting...' : 'Export CSV'}
            </Button>
          </div>
        </div>

        {/* Summary stat cards */}
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {snapLoading ? (
            Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[88px] rounded-lg" />)
          ) : (
            <>
              <StatCard label="Total Cases" value={snapshot?.totalCases ?? 0} icon={BarChart3}
                colorClass="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200" />
              <StatCard label="New / Pending" value={snapshot?.newCases ?? 0} icon={AlertCircle}
                colorClass="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200" />
              <StatCard label="Assigned" value={snapshot?.assignedCases ?? 0} icon={CheckCircle2}
                colorClass="bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200" />
              <StatCard label="In Progress" value={snapshot?.inProgressCases ?? 0} icon={Clock}
                colorClass="bg-cyan-50 dark:bg-cyan-950/20 border-cyan-200 dark:border-cyan-800 text-cyan-900 dark:text-cyan-200" />
              <StatCard label="Verification" value={snapshot?.pendingVerification ?? 0} icon={AlertCircle}
                colorClass="bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800 text-orange-900 dark:text-orange-200" />
              <StatCard label="Completed" value={(snapshot?.completedCases ?? 0) + (snapshot?.finalizedCases ?? 0)} icon={TrendingUp}
                colorClass="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 text-green-900 dark:text-green-200" />
            </>
          )}
        </div>

        {/* Filter bar */}
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-[1fr_200px_168px_auto]">
              {/* Search */}
              <div className="relative sm:col-span-2 lg:col-span-1 xl:col-span-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-9 h-9 w-full"
                  placeholder="Search borrower, case#, address..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1) }}
                />
              </div>

              {/* Bank filter */}
              <Select value={bankId} onValueChange={v => { setBankId(v); setPage(1) }}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="All Banks" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Banks</SelectItem>
                  {orgs.map((o: any) => (
                    <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status filter */}
              <Select value={status} onValueChange={v => { setStatus(v); setPage(1) }}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {Object.entries(STATUS_META).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Date range + clear */}
              <div className="flex gap-2 items-center sm:col-span-2 lg:col-span-1 xl:col-span-1">
                <Input
                  type="date"
                  className="h-9 text-sm flex-1 min-w-0"
                  value={fromDate}
                  onChange={e => { setFromDate(e.target.value); setPage(1) }}
                />
                <span className="text-muted-foreground text-xs shrink-0">–</span>
                <Input
                  type="date"
                  className="h-9 text-sm flex-1 min-w-0"
                  value={toDate}
                  onChange={e => { setToDate(e.target.value); setPage(1) }}
                />
                {hasActiveFilter && (
                  <Button variant="ghost" size="icon" onClick={resetFilters} className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cases table */}
        <Card className="border-0 shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border bg-muted/30">
                  <TableHead className="w-12 text-xs font-semibold">#</TableHead>
                  <TableHead
                    className="text-xs font-semibold cursor-pointer select-none whitespace-nowrap"
                    onClick={() => handleSort('createdAt')}
                  >
                    Date <SortIcon field="createdAt" />
                  </TableHead>
                  <TableHead
                    className="text-xs font-semibold cursor-pointer select-none"
                    onClick={() => handleSort('caseNumber')}
                  >
                    Case Ref <SortIcon field="caseNumber" />
                  </TableHead>
                  <TableHead
                    className="text-xs font-semibold cursor-pointer select-none"
                    onClick={() => handleSort('ownerName')}
                  >
                    Borrower Name <SortIcon field="ownerName" />
                  </TableHead>
                  <TableHead className="text-xs font-semibold">Loan Account</TableHead>
                  <TableHead
                    className="text-xs font-semibold cursor-pointer select-none"
                    onClick={() => handleSort('branchName')}
                  >
                    Bank / Branch <SortIcon field="branchName" />
                  </TableHead>
                  <TableHead className="text-xs font-semibold">Market Value</TableHead>
                  <TableHead className="text-xs font-semibold">Property Type</TableHead>
                  <TableHead className="text-xs font-semibold">Engineer</TableHead>
                  <TableHead
                    className="text-xs font-semibold cursor-pointer select-none"
                    onClick={() => handleSort('status')}
                  >
                    Status <SortIcon field="status" />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {casesLoading ? (
                  Array.from({ length: 12 }).map((_, i) => (
                    <TableRow key={i} className="border-border">
                      {Array.from({ length: 10 }).map((_, j) => (
                        <TableCell key={j} className="py-3">
                          <Skeleton className="h-4" style={{ width: `${60 + (j * 17) % 40}%` }} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : cases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-20 text-muted-foreground">
                      No cases found.{hasActiveFilter ? ' Try adjusting your filters.' : ''}
                    </TableCell>
                  </TableRow>
                ) : (
                  cases.map((c: any, i: number) => {
                    const mv = parseMarketValue(c.notes)
                    const sm = STATUS_META[c.status] ?? { label: c.status ?? '—', cls: 'bg-gray-100 text-gray-700' }
                    const rowNum = (page - 1) * PAGE_SIZE + i + 1

                    return (
                      <TableRow
                        key={c.id}
                        className="border-border hover:bg-muted/40 cursor-pointer transition-colors"
                        onClick={() => router.push(`/operations/cases/${c.id}`)}
                      >
                        <TableCell className="text-xs text-muted-foreground font-mono">{rowNum}</TableCell>
                        <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                          {c.createdAt
                            ? new Date(c.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
                            : '—'}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                          {c.caseNumber ?? '—'}
                        </TableCell>
                        <TableCell className="text-sm font-medium max-w-[180px]">
                          <span className="block truncate" title={c.ownerName ?? ''}>
                            {c.ownerName ?? '—'}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">
                          {c.loanAccountNumber ?? '—'}
                        </TableCell>
                        <TableCell className="text-xs min-w-[140px]">
                          <div className="font-medium text-sm leading-tight">{c.organization?.name ?? '—'}</div>
                          {c.branchName && (
                            <div className="text-muted-foreground leading-tight mt-0.5">{c.branchName}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm font-semibold whitespace-nowrap">
                          <span className={mv ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground'}>
                            {formatINR(mv)}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {c.propertyType ?? '—'}
                        </TableCell>
                        <TableCell className="text-xs">
                          {c.engineer?.name ?? <span className="text-muted-foreground italic">Unassigned</span>}
                        </TableCell>
                        <TableCell onClick={e => e.stopPropagation()}>
                          <Badge className={`text-xs font-normal ${sm.cls}`}>{sm.label}</Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {!casesLoading && total > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-sm text-muted-foreground">
                {total > PAGE_SIZE
                  ? `Showing ${((page - 1) * PAGE_SIZE) + 1}–${Math.min(page * PAGE_SIZE, total)} of ${total.toLocaleString()} cases`
                  : `${total.toLocaleString()} case${total !== 1 ? 's' : ''}`}
              </p>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(p => p - 1)}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground px-2">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  )
}
