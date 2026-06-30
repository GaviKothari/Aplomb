'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/app-layout'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { useReports } from '@/lib/api/hooks'
import {
  FileText, Search, Download, Eye, CheckCircle2, Clock,
  XCircle, AlertCircle, RotateCcw,
} from 'lucide-react'

const STATUS_META: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  DRAFT:          { label: 'Draft',          cls: 'bg-slate-100 text-slate-700',                      icon: Clock },
  SUBMITTED:      { label: 'Submitted',      cls: 'bg-blue-100 text-blue-800',                        icon: AlertCircle },
  UNDER_REVIEW:   { label: 'Under Review',   cls: 'bg-amber-100 text-amber-800',                      icon: Clock },
  APPROVED:       { label: 'Approved',       cls: 'bg-emerald-100 text-emerald-800',                  icon: CheckCircle2 },
  REJECTED:       { label: 'Rejected',       cls: 'bg-red-100 text-red-800',                          icon: XCircle },
  REVISION_REQUESTED: { label: 'Revision',   cls: 'bg-orange-100 text-orange-800',                    icon: RotateCcw },
  FINALIZED:      { label: 'Finalized',      cls: 'bg-purple-100 text-purple-800',                    icon: CheckCircle2 },
}

function fmtCrore(v?: number | null) {
  if (!v) return '—'
  const cr = v / 10_000_000
  return cr >= 1
    ? `₹${cr.toFixed(2)} Cr`
    : `₹${(v / 100_000).toFixed(2)} L`
}

export default function ReportsPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useReports({
    search: search || undefined,
    status: status !== 'all' ? status : undefined,
    page,
    limit: 25,
  })

  const reports: any[] = data?.data ?? []
  const total: number = data?.total ?? 0
  const totalPages = Math.ceil(total / 25)

  const statusCounts = reports.reduce((acc: Record<string, number>, r: any) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1
    return acc
  }, {})

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Finalized property valuation reports across all cases
          </p>
        </div>

        {/* Summary chips */}
        {!isLoading && total > 0 && (
          <div className="flex flex-wrap gap-2">
            {Object.entries(STATUS_META).map(([key, meta]) => {
              const count = statusCounts[key]
              if (!count) return null
              const Icon = meta.icon
              return (
                <button
                  key={key}
                  onClick={() => setStatus(status === key ? 'all' : key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all
                    ${status === key ? meta.cls + ' border-current ring-2 ring-offset-1 ring-current/30' : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted'}`}
                >
                  <Icon className="w-3 h-3" />
                  {meta.label} · {count}
                </button>
              )
            })}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9 h-9"
              placeholder="Search case number or address…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
          <Select value={status} onValueChange={v => { setStatus(v); setPage(1) }}>
            <SelectTrigger className="w-44 h-9">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.entries(STATUS_META).map(([k, m]) => (
                <SelectItem key={k} value={k}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card className="border-border/60 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 flex-1 max-w-xs" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/60 bg-muted/30 hover:bg-muted/30">
                    <TableHead className="text-xs font-semibold uppercase tracking-wide py-3">Report No.</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Property</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Bank</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Valuation</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Status</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Engineer</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Date</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-20 text-muted-foreground">
                        <FileText className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
                        <p className="text-sm">
                          {search || status !== 'all' ? 'No reports match your filters.' : 'No reports yet.'}
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : reports.map((r: any) => {
                    const meta = STATUS_META[r.status] ?? { label: r.status, cls: 'bg-gray-100 text-gray-700', icon: FileText }
                    const Icon = meta.icon
                    const date = r.submittedAt ?? r.createdAt
                    return (
                      <TableRow key={r.id} className="border-border/40 hover:bg-muted/30 transition-colors">
                        <TableCell className="font-mono text-xs font-semibold py-3">{r.reportNumber}</TableCell>
                        <TableCell className="text-sm max-w-xs">
                          <div>
                            <p className="font-medium text-xs text-muted-foreground">{r.case?.caseNumber}</p>
                            <p className="truncate max-w-56">{r.case?.propertyAddress}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {r.case?.organization?.name ?? '—'}
                        </TableCell>
                        <TableCell className="text-sm font-semibold tabular-nums">
                          {fmtCrore(r.totalMarketValue)}
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-xs font-normal gap-1 ${meta.cls}`}>
                            <Icon className="w-3 h-3" />
                            {meta.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {r.submittedBy?.name ?? '—'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {date ? new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" asChild>
                              <Link href={`/operations/cases/${r.case?.id}`}>
                                <Eye className="w-3 h-3" />View
                              </Link>
                            </Button>
                            {(r.status === 'FINALIZED' || r.status === 'APPROVED') && (
                              <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-muted-foreground">
                                <Download className="w-3 h-3" />PDF
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{total} reports total</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                Previous
              </Button>
              <span className="flex items-center px-2">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
