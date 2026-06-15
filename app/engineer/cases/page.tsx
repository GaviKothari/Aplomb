'use client'

import { useState } from 'react'
import { useCases } from '@/lib/api/hooks'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import { Search, Briefcase, ChevronRight } from 'lucide-react'

const STATUS_LABEL: Record<string, string> = {
  NEW: 'New',
  ASSIGNED: 'Assigned',
  SITE_VISIT_SCHEDULED: 'Visit Scheduled',
  SITE_VISIT_IN_PROGRESS: 'In Progress',
  SITE_VISIT_COMPLETED: 'Completed',
  UNDER_VERIFICATION: 'Under Verification',
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
  MEDIUM: 'bg-amber-500',
  LOW: 'bg-green-500',
}

export default function EngineerCasesPage() {
  const [search, setSearch] = useState('')
  const { data, isLoading } = useCases({ limit: 50, search: search || undefined })
  const cases: any[] = data?.data ?? []

  return (
    <div className="flex flex-col h-screen">
      {/* Sticky header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 p-4 pb-2 border-b border-border/50">
        <h1 className="text-xl font-bold mb-3">My Cases</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search address, ref no…"
            className="pl-9 h-9 text-sm"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 pb-2 space-y-2">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))
        ) : cases.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <Briefcase className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No cases found</p>
          </div>
        ) : (
          cases.map((c: any) => {
            const status = (c.status ?? '').toUpperCase()
            const priority = (c.priority ?? '').toUpperCase()
            return (
              <Link key={c.id} href={`/engineer/cases/${c.id}`}>
                <Card className="active:scale-[0.99] transition-transform hover:border-primary/40">
                  <CardContent className="pt-3 pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full flex-shrink-0 ${PRIORITY_DOT[priority] ?? 'bg-slate-300'}`} />
                          <span className="text-sm font-semibold truncate">
                            {c.referenceNumber ?? c.id.slice(0, 8).toUpperCase()}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {c.propertyAddress ?? c.address ?? 'No address provided'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 font-medium">{c.bankName ?? c.bank ?? ''}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <Badge className={`text-[10px] ${STATUS_COLOR[status] ?? 'bg-slate-100 text-slate-700'}`}>
                          {STATUS_LABEL[status] ?? status}
                        </Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                    {c.siteVisitDate && (
                      <p className="text-[10px] text-muted-foreground mt-2 border-t border-border/50 pt-2">
                        Visit: {new Date(c.siteVisitDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
