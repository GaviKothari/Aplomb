'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCard } from '@/components/dashboard/stat-card'
import { ChartSection } from '@/components/dashboard/chart-section'
import {
  Briefcase, CheckCircle2, Clock, Pause,
  ArrowRight, RefreshCw, AlertTriangle,
} from 'lucide-react'
import { useMisSnapshot, useCases, useVerificationQueue } from '@/lib/api/hooks'
import { useUser } from '@clerk/nextjs'

const STATUS_META: Record<string, { label: string; cls: string }> = {
  NEW:                   { label: 'New',          cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  ASSIGNED:              { label: 'Assigned',     cls: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300' },
  SITE_VISIT_SCHEDULED:  { label: 'Visit Sched',  cls: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300' },
  SITE_VISIT_IN_PROGRESS:{ label: 'On Visit',     cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  SITE_VISIT_COMPLETED:  { label: 'Visit Done',   cls: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300' },
  UNDER_VERIFICATION:    { label: 'Verification', cls: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300' },
  REVISION_REQUESTED:    { label: 'Revision',     cls: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
  FINALIZED:             { label: 'Finalized',    cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' },
  SENT_TO_BANK:          { label: 'Sent to Bank', cls: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
  ON_HOLD:               { label: 'On Hold',      cls: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  CLOSED:                { label: 'Closed',       cls: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
}

function formatTAT(hours: number): string {
  if (!hours || hours <= 0) return '—'
  const days = hours / 24
  return days < 1 ? `${hours.toFixed(0)}h` : `${days.toFixed(1)}d`
}

function formatRevenue(n: number): string {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)} Cr`
  if (n >= 1_00_000)   return `₹${(n / 1_00_000).toFixed(1)} L`
  if (n >= 1_000)      return `₹${(n / 1_000).toFixed(0)} K`
  return `₹${n}`
}

function RowSkeleton() {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border/40 last:border-0">
      <Skeleton className="h-8 w-8 rounded-lg" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-48" />
        <Skeleton className="h-3 w-28" />
      </div>
      <Skeleton className="h-5 w-20 rounded-full" />
    </div>
  )
}

export function AdminDashboard() {
  const router = useRouter()
  const { user } = useUser()
  const { data: snapshot, isLoading: snapLoading, refetch } = useMisSnapshot()
  const { data: casesData, isLoading: casesLoading } = useCases({ limit: 8, sortBy: 'createdAt', sortOrder: 'desc' })
  const { data: queueData, isLoading: queueLoading } = useVerificationQueue()

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = user?.firstName ?? 'there'

  const totalCases   = snapshot?.totalCases ?? 0
  const activeCases  = (snapshot?.assignedCases ?? 0) + (snapshot?.inProgressCases ?? 0)
  const completed    = (snapshot?.completedCases ?? 0) + (snapshot?.finalizedCases ?? 0)
  const onHold       = snapshot?.onHoldCases ?? 0
  const avgTat       = Number(snapshot?.avgTatHours ?? 0)
  const revenue      = snapshot?.totalRevenue ?? 0
  const completionPct = totalCases > 0 ? Math.round((completed / totalCases) * 100) : 0

  const recentCases: any[] = casesData?.data ?? []
  const queue: any[] = (queueData ?? []).filter((v: any) => !v.decision || v.decision === 'PENDING').slice(0, 6)

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {greeting}, {firstName} 👋
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => refetch()}>
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </Button>
      </div>

      {/* KPI Cards */}
      {snapLoading ? (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Cases"
            value={totalCases.toLocaleString()}
            icon={Briefcase}
            iconBg="bg-blue-50 dark:bg-blue-950/60"
            iconColor="text-blue-600"
            sub={`${completionPct}% completion rate`}
          />
          <StatCard
            label="Active Pipeline"
            value={activeCases.toLocaleString()}
            icon={Clock}
            iconBg="bg-amber-50 dark:bg-amber-950/60"
            iconColor="text-amber-600"
            sub={`${snapshot?.newCases ?? 0} new · ${snapshot?.assignedCases ?? 0} assigned`}
          />
          <StatCard
            label="Completed"
            value={completed.toLocaleString()}
            icon={CheckCircle2}
            iconBg="bg-emerald-50 dark:bg-emerald-950/60"
            iconColor="text-emerald-600"
            sub={formatRevenue(revenue) + ' collected'}
            subPositive={revenue > 0}
          />
          <StatCard
            label="Avg Turnaround"
            value={formatTAT(avgTat)}
            icon={Pause}
            iconBg="bg-violet-50 dark:bg-violet-950/60"
            iconColor="text-violet-600"
            sub={onHold > 0 ? `${onHold} cases on hold` : 'No cases on hold'}
            subPositive={onHold === 0}
          />
        </div>
      )}

      {/* Charts */}
      <ChartSection />

      {/* Bottom tables */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Recent Cases — 3/5 */}
        <Card className="lg:col-span-3 border-border/60">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Recent Cases</CardTitle>
              <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs text-muted-foreground" asChild>
                <Link href="/operations/cases">
                  View all <ArrowRight className="w-3 h-3" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {casesLoading ? (
              <div>{Array.from({ length: 6 }).map((_, i) => <RowSkeleton key={i} />)}</div>
            ) : recentCases.length === 0 ? (
              <p className="text-center text-muted-foreground py-10 text-sm">No cases yet.</p>
            ) : (
              <div>
                {recentCases.map((c: any) => {
                  const sm = STATUS_META[c.status] ?? { label: c.status, cls: 'bg-gray-100 text-gray-700' }
                  return (
                    <div
                      key={c.id}
                      className="flex items-center gap-3 py-3 border-b border-border/40 last:border-0 hover:bg-muted/30 -mx-2 px-2 rounded-lg cursor-pointer transition-colors"
                      onClick={() => router.push(`/operations/cases/${c.id}`)}
                    >
                      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Briefcase className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.ownerName ?? c.propertyAddress ?? '—'}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {c.organization?.name ?? '—'}
                          {c.branchName ? ` · ${c.branchName}` : ''}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <Badge className={`text-xs font-normal ${sm.cls}`}>{sm.label}</Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : ''}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right column — 2/5 */}
        <div className="lg:col-span-2 space-y-5">
          {/* Completion ring */}
          <Card className="border-border/60">
            <CardContent className="pt-5 pb-4">
              {snapLoading ? <Skeleton className="h-20" /> : (
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16 shrink-0">
                    <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                      <circle cx="32" cy="32" r="26" fill="none" stroke="var(--border)" strokeWidth="6" />
                      <circle
                        cx="32" cy="32" r="26"
                        fill="none"
                        stroke="#10B981"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 26}`}
                        strokeDashoffset={`${2 * Math.PI * 26 * (1 - completionPct / 100)}`}
                        className="transition-all duration-700"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
                      {completionPct}%
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Completion Rate</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{completed.toLocaleString()} of {totalCases.toLocaleString()} cases done</p>
                    <p className="text-xs mt-1">
                      <span className={completionPct >= 90 ? 'text-emerald-600 font-medium' : completionPct >= 70 ? 'text-amber-600 font-medium' : 'text-red-500 font-medium'}>
                        {completionPct >= 90 ? '✓ Excellent' : completionPct >= 70 ? '↗ On track' : '↓ Needs attention'}
                      </span>
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending Verifications */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  Pending Verifications
                </CardTitle>
                {queue.length > 0 && (
                  <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 text-xs">
                    {queue.length}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {queueLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
                </div>
              ) : queue.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-6">
                  ✓ All clear
                </p>
              ) : (
                <div className="space-y-2">
                  {queue.map((v: any) => (
                    <div
                      key={v.id}
                      className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/40 cursor-pointer transition-colors"
                      onClick={() => router.push(`/quality/verification/${v.id}`)}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">
                          {v.case?.ownerName ?? v.case?.propertyAddress ?? 'Unknown property'}
                        </p>
                        <p className="text-xs text-muted-foreground">{v.case?.organization?.name ?? '—'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
