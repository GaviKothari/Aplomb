'use client'

import { useUser } from '@clerk/nextjs'
import { useCases } from '@/lib/api/hooks'
import { useTodayAttendance } from '@/lib/api/hooks'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import { Briefcase, Clock, CheckCircle2, AlertCircle, ChevronRight } from 'lucide-react'

function fmt(d: string | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const STATUS_LABEL: Record<string, string> = {
  ASSIGNED: 'Assigned',
  SITE_VISIT_SCHEDULED: 'Visit Scheduled',
  SITE_VISIT_IN_PROGRESS: 'In Progress',
  SITE_VISIT_COMPLETED: 'Completed',
  NEW: 'New',
  REVISION_REQUESTED: 'Revision',
}

const STATUS_COLOR: Record<string, string> = {
  ASSIGNED: 'bg-blue-100 text-blue-800',
  SITE_VISIT_SCHEDULED: 'bg-amber-100 text-amber-800',
  SITE_VISIT_IN_PROGRESS: 'bg-purple-100 text-purple-800',
  SITE_VISIT_COMPLETED: 'bg-emerald-100 text-emerald-800',
  NEW: 'bg-slate-100 text-slate-800',
  REVISION_REQUESTED: 'bg-red-100 text-red-800',
}

export default function EngineerHomePage() {
  const { user } = useUser()
  const { data: todayAttendance, isLoading: loadingAttendance } = useTodayAttendance()
  const { data: casesData, isLoading: loadingCases } = useCases({ limit: 5 })

  const isPunchedIn = todayAttendance?.punchIn && !todayAttendance?.punchOut
  const cases = casesData?.data ?? []

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="p-4 space-y-5">
      {/* Header */}
      <div className="pt-2">
        <p className="text-sm text-muted-foreground">{greeting},</p>
        <h1 className="text-2xl font-bold">{user?.firstName ?? 'Engineer'}</h1>
        <p className="text-xs text-muted-foreground mt-0.5">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      </div>

      {/* Punch status card */}
      <Link href="/engineer/punch-in-out">
        {loadingAttendance ? (
          <Skeleton className="h-20 w-full rounded-xl" />
        ) : (
          <Card className={isPunchedIn ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20' : 'border-slate-200'}>
            <CardContent className="pt-4 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${isPunchedIn ? 'bg-emerald-200 dark:bg-emerald-800' : 'bg-slate-100 dark:bg-slate-800'}`}>
                  <Clock className={`h-5 w-5 ${isPunchedIn ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500'}`} />
                </div>
                <div>
                  <p className="font-semibold text-sm">{isPunchedIn ? 'You are punched in' : 'Not yet punched in'}</p>
                  <p className="text-xs text-muted-foreground">
                    {isPunchedIn
                      ? `Since ${fmt(todayAttendance?.punchIn)}`
                      : 'Tap to punch in'}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        )}
      </Link>

      {/* Quick stats row */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-3 pb-3 text-center">
            <p className="text-2xl font-bold text-blue-600">{loadingCases ? '—' : cases.filter((c: any) => ['ASSIGNED','SITE_VISIT_SCHEDULED','SITE_VISIT_IN_PROGRESS'].includes((c.status ?? '').toUpperCase())).length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-3 text-center">
            <p className="text-2xl font-bold text-emerald-600">{loadingCases ? '—' : cases.filter((c: any) => (c.status ?? '').toUpperCase() === 'SITE_VISIT_COMPLETED').length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Done</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-3 text-center">
            <p className="text-2xl font-bold text-amber-600">{loadingCases ? '—' : cases.filter((c: any) => (c.status ?? '').toUpperCase() === 'REVISION_REQUESTED').length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Revision</p>
          </CardContent>
        </Card>
      </div>

      {/* Today's cases */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm">My Cases</h2>
          <Link href="/engineer/cases" className="text-xs text-primary font-medium">See all →</Link>
        </div>

        {loadingCases ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
          </div>
        ) : cases.length === 0 ? (
          <Card>
            <CardContent className="pt-8 pb-8 flex flex-col items-center gap-2 text-center">
              <CheckCircle2 className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No cases assigned yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {cases.slice(0, 4).map((c: any) => {
              const status = (c.status ?? '').toUpperCase()
              return (
                <Link key={c.id} href={`/engineer/cases/${c.id}`}>
                  <Card className="hover:border-primary/50 transition-colors">
                    <CardContent className="pt-3 pb-3 flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3 min-w-0">
                        <Briefcase className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{c.referenceNumber ?? c.id.slice(0, 8).toUpperCase()}</p>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{c.propertyAddress ?? c.address ?? 'No address'}</p>
                          <p className="text-xs text-muted-foreground">{c.bankName ?? c.bank}</p>
                        </div>
                      </div>
                      <Badge className={`text-[10px] shrink-0 ${STATUS_COLOR[status] ?? 'bg-slate-100 text-slate-800'}`}>
                        {STATUS_LABEL[status] ?? status}
                      </Badge>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
