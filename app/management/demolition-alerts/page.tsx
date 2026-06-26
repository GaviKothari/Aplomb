'use client'

import { useState } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, CartesianGrid,
} from 'recharts'
import {
  useDemolitionStats, useDemolitionZones, useDemolitionProperties,
  useDemolitionAlerts, useMatchAllDemolition, useUpdateDemolitionAlert,
  useCleanupNonDelhiAlerts,
} from '@/lib/api/hooks'
import {
  AlertTriangle, Shield, Database, CheckCircle2, Search,
  RefreshCw, Eye, XCircle, ChevronLeft, ChevronRight, MapPin,
  FileText, CalendarDays, Building2, Trash2,
} from 'lucide-react'
import Link from 'next/link'

// ── helpers ──────────────────────────────────────────────────────────────────
const ZONE_COLORS: Record<string, string> = {
  'South Zone':        '#3b82f6',
  'Central Zone':      '#8b5cf6',
  'Shahdara Zone':     '#f59e0b',
  'Najafgarh Zone':    '#10b981',
  'North Zone':        '#ef4444',
  'Rohini Zone':       '#06b6d4',
  'Keshavpuram Zone':  '#ec4899',
  'Narela Zone':       '#f97316',
  'Civil Lines Zone':  '#6366f1',
  'West Zone':         '#84cc16',
}

function fmtDate(d: string | Date | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function ConfidenceBadge({ score }: { score: number }) {
  if (score >= 70) return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 text-xs">High {score}%</Badge>
  if (score >= 45) return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 text-xs">Medium {score}%</Badge>
  return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 text-xs">Low {score}%</Badge>
}

// ── stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color, bg, sub }: {
  label: string; value: string | number; icon: any;
  color: string; bg: string; sub?: string
}) {
  return (
    <div className={`${bg} rounded-xl p-4 border border-transparent`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  )
}

// ── PROPERTIES TAB ────────────────────────────────────────────────────────────
function PropertiesTab() {
  const [search, setSearch] = useState('')
  const [zone, setZone]     = useState('all')
  const [page, setPage]     = useState(1)

  const { data: zonesData } = useDemolitionZones()
  const zones: string[] = zonesData ?? []

  const { data, isLoading } = useDemolitionProperties({
    search: search || undefined,
    zone:   zone !== 'all' ? zone : undefined,
    page, limit: 50,
  })
  const rows: any[]  = data?.data ?? []
  const total: number = data?.total ?? 0
  const totalPages    = data?.totalPages ?? 1

  return (
    <div className="space-y-4">
      {/* filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9 h-9" placeholder="Search address, owner, notice no…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <Select value={zone} onValueChange={v => { setZone(v); setPage(1) }}>
          <SelectTrigger className="w-52 h-9">
            <SelectValue placeholder="All Zones" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Zones</SelectItem>
            {zones.map(z => (
              <SelectItem key={z} value={z}>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: ZONE_COLORS[z] ?? '#888' }} />
                  {z}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="self-center text-sm text-muted-foreground whitespace-nowrap">
          {total.toLocaleString('en-IN')} notices
        </span>
      </div>

      {/* table */}
      <div className="border border-border/60 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30 border-b border-border/60">
                {['Owner', 'Address', 'Zone', 'Notice No.', 'Notice Date', 'Status'].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/40">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="py-3 px-4"><Skeleton className="h-4 w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-muted-foreground">
                    {search || zone !== 'all' ? 'No results for these filters.' : 'No notices loaded yet.'}
                  </td>
                </tr>
              ) : rows.map((r: any) => (
                <tr key={r.id} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                  <td className="py-3 px-4 font-medium max-w-36 truncate">
                    {r.ownerName || <span className="text-muted-foreground italic">Unknown</span>}
                  </td>
                  <td className="py-3 px-4 text-muted-foreground max-w-72 truncate" title={r.address}>{r.address}</td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    {r.zone ? (
                      <span className="flex items-center gap-1.5 text-xs">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: ZONE_COLORS[r.zone] ?? '#888' }} />
                        {r.zone}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-muted-foreground whitespace-nowrap">{r.noticeNumber || '—'}</td>
                  <td className="py-3 px-4 text-xs whitespace-nowrap">{fmtDate(r.noticeDate)}</td>
                  <td className="py-3 px-4">
                    <Badge className={r.status === 'ACTIVE'
                      ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 text-xs'
                      : 'bg-gray-100 text-gray-600 text-xs'
                    }>{r.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/40 bg-muted/10">
            <span className="text-xs text-muted-foreground">
              Page {page} of {totalPages} · {total.toLocaleString('en-IN')} total
            </span>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── ALERTS TAB ────────────────────────────────────────────────────────────────
function AlertsTab() {
  const [status, setStatus] = useState('open')
  const [page, setPage]     = useState(1)

  const { data, isLoading, refetch } = useDemolitionAlerts({ status, page, limit: 20 })
  const matchAll = useMatchAllDemolition()
  const update   = useUpdateDemolitionAlert()
  const alerts: any[] = data?.data ?? []
  const total          = data?.total ?? 0
  const totalPages     = data?.totalPages ?? 1

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2">
          {[
            { v: 'open',      l: 'Open' },
            { v: 'confirmed', l: 'Confirmed' },
            { v: 'potential', l: 'Potential' },
            { v: 'dismissed', l: 'Dismissed' },
          ].map(s => (
            <Button
              key={s.v}
              size="sm"
              variant={status === s.v ? 'default' : 'outline'}
              className="h-8 text-xs"
              onClick={() => { setStatus(s.v); setPage(1) }}
            >
              {s.l}
            </Button>
          ))}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-2 h-8 text-xs"
          onClick={() => matchAll.mutate()}
          disabled={matchAll.isPending}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${matchAll.isPending ? 'animate-spin' : ''}`} />
          {matchAll.isPending ? 'Scanning…' : 'Run Cross-Match on All Cases'}
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">{total} alerts</p>

      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
        ) : alerts.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground space-y-2">
            <Shield className="w-10 h-10 mx-auto text-muted-foreground/30" />
            <p className="text-sm">No {status} alerts found.</p>
            {status === 'open' && (
              <Button size="sm" variant="outline" className="gap-2" onClick={() => matchAll.mutate()} disabled={matchAll.isPending}>
                <RefreshCw className="w-3.5 h-3.5" />Run cross-match to generate alerts
              </Button>
            )}
          </div>
        ) : alerts.map((alert: any) => {
          const c  = alert.case
          const dp = alert.demolitionProperty
          const dismissed = alert.matchStatus === 'DISMISSED'
          const confirmed = alert.matchStatus === 'CONFIRMED'

          return (
            <div key={alert.id} className={`border rounded-xl p-4 transition-colors ${
              dismissed ? 'border-border/40 opacity-60'
              : confirmed ? 'border-red-200 bg-red-50/50 dark:border-red-800/40 dark:bg-red-900/10'
              : 'border-amber-200 bg-amber-50/50 dark:border-amber-800/40 dark:bg-amber-900/10'
            }`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0 space-y-2">
                  {/* case row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-muted-foreground">{c?.caseNumber}</span>
                    <ConfidenceBadge score={alert.confidenceScore} />
                    {confirmed && <Badge className="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 text-xs">Confirmed</Badge>}
                    {dismissed && <Badge className="bg-gray-100 text-gray-600 text-xs">Dismissed</Badge>}
                  </div>

                  <div className="grid md:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Case Property</p>
                      <div className="flex items-start gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                        <p className="text-sm">{c?.propertyAddress}</p>
                      </div>
                      {c?.organization?.name && (
                        <p className="text-xs text-muted-foreground">Bank: {c.organization.name}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">MCD Notice</p>
                      <div className="flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                        <p className="text-sm truncate">{dp?.address}</p>
                      </div>
                      <div className="flex gap-3 text-xs text-muted-foreground flex-wrap">
                        {dp?.zone && (
                          <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: ZONE_COLORS[dp.zone] ?? '#888' }} />
                            {dp.zone}
                          </span>
                        )}
                        {dp?.noticeDate && (
                          <span className="flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" />
                            {fmtDate(dp.noticeDate)}
                          </span>
                        )}
                        {dp?.noticeNumber && (
                          <span className="font-mono">{dp.noticeNumber}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* actions */}
                <div className="flex flex-col gap-1.5 shrink-0">
                  <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs justify-start" asChild>
                    <Link href={`/operations/cases/${c?.id}`}>
                      <Eye className="w-3 h-3" />View Case
                    </Link>
                  </Button>
                  {!dismissed && !confirmed && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1.5 text-xs justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => update.mutate({ id: alert.id, status: 'CONFIRMED' })}
                        disabled={update.isPending}
                      >
                        <AlertTriangle className="w-3 h-3" />Confirm
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1.5 text-xs justify-start text-muted-foreground"
                        onClick={() => update.mutate({ id: alert.id, status: 'DISMISSED', reason: 'False match' })}
                        disabled={update.isPending}
                      >
                        <XCircle className="w-3 h-3" />Dismiss
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

// ── ANALYTICS TAB ─────────────────────────────────────────────────────────────
function AnalyticsTab({ stats }: { stats: any }) {
  if (!stats) return <div className="py-16 text-center text-muted-foreground">Loading analytics…</div>

  const zoneData = (stats.zones ?? [])
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, 10)

  const yearData = (stats.yearTrend ?? [])
    .filter((y: any) => Number(y.year) >= 2009)

  return (
    <div className="space-y-6">
      {/* Zone bar chart */}
      <div>
        <p className="text-sm font-semibold mb-3">Notices by Zone</p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={zoneData} layout="vertical" margin={{ left: 16, right: 24, top: 4, bottom: 4 }}>
            <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => v.toLocaleString('en-IN')} />
            <YAxis type="category" dataKey="zone" tick={{ fontSize: 11 }} width={140} />
            <Tooltip
              formatter={(v: number) => [v.toLocaleString('en-IN'), 'Notices']}
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={22}
              fill="#3b82f6"
              label={{ position: 'right', fontSize: 10, formatter: (v: number) => v > 999 ? `${(v/1000).toFixed(1)}k` : v }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Year area chart */}
      <div>
        <p className="text-sm font-semibold mb-3">Year-wise Volume (2009 – 2026)</p>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={yearData} margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
            <defs>
              <linearGradient id="demolGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="year" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              formatter={(v: number) => [v.toLocaleString('en-IN'), 'Notices']}
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
            />
            <Area
              type="monotone" dataKey="count" stroke="#ef4444" strokeWidth={2}
              fill="url(#demolGrad)" dot={false} activeDot={{ r: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Zone summary table */}
      <div>
        <p className="text-sm font-semibold mb-3">Zone Breakdown</p>
        <div className="border border-border/60 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30 border-b border-border/60">
                <th className="text-left py-2 px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Zone</th>
                <th className="text-right py-2 px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notices</th>
                <th className="text-right py-2 px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Share</th>
              </tr>
            </thead>
            <tbody>
              {zoneData.map((z: any) => {
                const pct = stats.total > 0 ? ((z.count / stats.total) * 100).toFixed(1) : '0'
                const color = ZONE_COLORS[z.zone] ?? '#888'
                return (
                  <tr key={z.zone} className="border-b border-border/40 hover:bg-muted/20">
                    <td className="py-2.5 px-4">
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: color }} />
                        {z.zone}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-semibold">{z.count.toLocaleString('en-IN')}</td>
                    <td className="py-2.5 px-4 text-right text-muted-foreground">{pct}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── PAGE ─────────────────────────────────────────────────────────────────────
export default function DemolitionAlertsPage() {
  const { data: stats, isLoading: statsLoading } = useDemolitionStats()
  const cleanup = useCleanupNonDelhiAlerts()

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Demolition Alerts</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              MCD unauthorized construction notices · cross-matched against active cases
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
            onClick={() => cleanup.mutate()}
            disabled={cleanup.isPending}
          >
            <Trash2 className={`w-3.5 h-3.5 ${cleanup.isPending ? 'animate-pulse' : ''}`} />
            {cleanup.isPending ? 'Cleaning up…' : 'Remove Non-Delhi Alerts'}
          </Button>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {statsLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          ) : (
            <>
              <StatCard
                label="Total Notices" icon={Database}
                value={stats?.total?.toLocaleString('en-IN') ?? '—'}
                color="text-blue-600" bg="bg-blue-50 dark:bg-blue-900/20"
                sub="MCD demolition database"
              />
              <StatCard
                label="Open Alerts" icon={AlertTriangle}
                value={stats?.recentAlerts ?? 0}
                color="text-amber-600" bg="bg-amber-50 dark:bg-amber-900/20"
                sub="Cases flagged for review"
              />
              <StatCard
                label="Confirmed Risk" icon={XCircle}
                value={stats?.matchedCases ?? 0}
                color="text-red-600" bg="bg-red-50 dark:bg-red-900/20"
                sub="High-confidence matches"
              />
              <StatCard
                label="Zones Covered" icon={MapPin}
                value={stats?.zones?.length ?? 0}
                color="text-emerald-600" bg="bg-emerald-50 dark:bg-emerald-900/20"
                sub="Delhi MCD zones"
              />
            </>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="alerts">
          <TabsList className="h-9">
            <TabsTrigger value="alerts" className="text-xs gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />Case Alerts
            </TabsTrigger>
            <TabsTrigger value="properties" className="text-xs gap-1.5">
              <FileText className="w-3.5 h-3.5" />MCD Database
            </TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs gap-1.5">
              <Building2 className="w-3.5 h-3.5" />Analytics
            </TabsTrigger>
          </TabsList>

          <Card className="border-border/60 mt-4">
            <CardContent className="pt-5">
              <TabsContent value="alerts"     className="mt-0"><AlertsTab /></TabsContent>
              <TabsContent value="properties" className="mt-0"><PropertiesTab /></TabsContent>
              <TabsContent value="analytics"  className="mt-0"><AnalyticsTab stats={stats} /></TabsContent>
            </CardContent>
          </Card>
        </Tabs>
      </div>
    </AppLayout>
  )
}
