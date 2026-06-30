'use client'

import { useState } from 'react'
import { useCases, useMe } from '@/lib/api/hooks'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import { Search, Briefcase, ChevronRight, MapPin, Clock, AlertCircle } from 'lucide-react'

const STATUS_LABEL: Record<string, string> = {
  NEW: 'New',
  ASSIGNED: 'Assigned',
  SITE_VISIT_SCHEDULED: 'Scheduled',
  SITE_VISIT_IN_PROGRESS: 'In Progress',
  SITE_VISIT_COMPLETED: 'Completed',
  UNDER_VERIFICATION: 'Verification',
  REVISION_REQUESTED: 'Revision',
  SENT_TO_BANK: 'Sent to Bank',
  CLOSED: 'Closed',
}

const STATUS_COLOR: Record<string, string> = {
  NEW: 'bg-slate-100 text-slate-700',
  ASSIGNED: 'bg-blue-100 text-blue-800',
  SITE_VISIT_SCHEDULED: 'bg-amber-100 text-amber-800',
  SITE_VISIT_IN_PROGRESS: 'bg-purple-100 text-purple-800',
  SITE_VISIT_COMPLETED: 'bg-emerald-100 text-emerald-800',
  UNDER_VERIFICATION: 'bg-indigo-100 text-indigo-800',
  REVISION_REQUESTED: 'bg-red-100 text-red-800',
  SENT_TO_BANK: 'bg-teal-100 text-teal-800',
  CLOSED: 'bg-gray-100 text-gray-600',
}

const PRIORITY_DOT: Record<string, string> = {
  HIGH: 'bg-red-500',
  CRITICAL: 'bg-red-600',
  MEDIUM: 'bg-amber-500',
  LOW: 'bg-green-500',
}

const TABS = [
  { key: 'active',    label: 'Active',    statuses: ['ASSIGNED', 'SITE_VISIT_SCHEDULED', 'SITE_VISIT_IN_PROGRESS'] },
  { key: 'revision',  label: 'Revision',  statuses: ['REVISION_REQUESTED'] },
  { key: 'done',      label: 'Done',      statuses: ['SITE_VISIT_COMPLETED', 'UNDER_VERIFICATION', 'SENT_TO_BANK'] },
  { key: 'all',       label: 'All',       statuses: [] },
]

function isToday(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
}

export default function EngineerCasesPage() {
  const [search, setSearch]   = useState('')
  const [tab, setTab]         = useState('active')
  const { data: me }          = useMe()

  const { data, isLoading } = useCases({
    limit: 100,
    search: search || undefined,
    engineerId: me?.id,
  })

  const allCases: any[] = data?.data ?? []

  const activeTab = TABS.find(t => t.key === tab)!
  const filtered = activeTab.statuses.length
    ? allCases.filter(c => activeTab.statuses.includes((c.status ?? '').toUpperCase()))
    : allCases

  // Sort: today's visits first, then by priority, then by date
  const sorted = [...filtered].sort((a, b) => {
    const aToday = a.siteVisitDate && isToday(a.siteVisitDate) ? 0 : 1
    const bToday = b.siteVisitDate && isToday(b.siteVisitDate) ? 0 : 1
    if (aToday !== bToday) return aToday - bToday
    const pOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
    const ap = pOrder[(a.priority ?? '').toUpperCase()] ?? 4
    const bp = pOrder[(b.priority ?? '').toUpperCase()] ?? 4
    return ap - bp
  })

  const tabCounts = TABS.map(t => ({
    key: t.key,
    count: t.statuses.length
      ? allCases.filter(c => t.statuses.includes((c.status ?? '').toUpperCase())).length
      : allCases.length,
  }))

  return (
    <div className="flex flex-col h-screen">
      {/* Sticky header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 px-4 pt-4 pb-0 border-b border-border/50">
        <h1 className="text-xl font-bold mb-3">My Cases</h1>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search address, ref no…"
            className="pl-9 h-9 text-sm"
          />
        </div>

        {/* Status tabs */}
        <div className="flex gap-1 overflow-x-auto pb-0 scrollbar-none">
          {TABS.map(t => {
            const count = tabCounts.find(x => x.key === t.key)?.count ?? 0
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                  tab === t.key
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-muted-foreground'
                }`}
              >
                {t.label}
                {count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                    tab === t.key ? 'bg-blue-100 text-blue-700' : 'bg-muted text-muted-foreground'
                  }`}>{count}</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 pb-4">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <Briefcase className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              {tab === 'active' ? 'No active cases assigned to you' : 'No cases found'}
            </p>
          </div>
        ) : (
          sorted.map((c: any) => {
            const status    = (c.status ?? '').toUpperCase()
            const priority  = (c.priority ?? '').toUpperCase()
            const visitToday = c.siteVisitDate && isToday(c.siteVisitDate)
            const isRevision = status === 'REVISION_REQUESTED'

            return (
              <Link key={c.id} href={`/engineer/cases/${c.id}`}>
                <div className={`rounded-xl border p-4 active:scale-[0.98] transition-transform ${
                  visitToday ? 'border-blue-300 bg-blue-50/60 dark:bg-blue-950/20' :
                  isRevision ? 'border-red-200 bg-red-50/40 dark:bg-red-950/10' :
                  'border-border bg-card'
                }`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`h-2 w-2 rounded-full flex-shrink-0 ${PRIORITY_DOT[priority] ?? 'bg-slate-300'}`} />
                        <span className="text-xs font-bold text-muted-foreground">
                          {c.caseNumber ?? c.referenceNumber ?? c.id.slice(0, 8).toUpperCase()}
                        </span>
                        {visitToday && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-600 text-white font-semibold">TODAY</span>
                        )}
                        {isRevision && (
                          <AlertCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-sm font-semibold line-clamp-1">
                        {c.ownerName ?? 'Unknown Owner'}
                      </p>
                      <div className="flex items-start gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {c.propertyAddress ?? 'No address'}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <Badge className={`text-[10px] ${STATUS_COLOR[status] ?? 'bg-slate-100 text-slate-700'}`}>
                        {STATUS_LABEL[status] ?? status}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>

                  {c.siteVisitDate && (
                    <div className="mt-2 pt-2 border-t border-border/50 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <p className="text-[11px] text-muted-foreground">
                        {visitToday ? 'Visit today' : `Visit: ${new Date(c.siteVisitDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                      </p>
                      {c.organization?.name && (
                        <span className="ml-auto text-[11px] text-muted-foreground">{c.organization.name}</span>
                      )}
                    </div>
                  )}
                </div>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
