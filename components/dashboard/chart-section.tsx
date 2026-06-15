'use client'

import {
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis,
  CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useBankWiseMis, useEngineerPerformance, useMonthlyCases, useMisSnapshot } from '@/lib/api/hooks'
import { TrendingUp, Users, Building2, Activity } from 'lucide-react'

const CHART_COLORS = {
  blue:    '#3B82F6',
  emerald: '#10B981',
  violet:  '#8B5CF6',
  amber:   '#F59E0B',
  rose:    '#F43F5E',
  cyan:    '#06B6D4',
  orange:  '#F97316',
  slate:   '#64748B',
}

const STATUS_COLORS: Record<string, string> = {
  'New':        CHART_COLORS.blue,
  'Assigned':   CHART_COLORS.violet,
  'In Progress':CHART_COLORS.amber,
  'Completed':  CHART_COLORS.emerald,
  'On Hold':    CHART_COLORS.rose,
}

function ChartSkeleton({ height = 220 }: { height?: number }) {
  return <Skeleton className="w-full rounded-lg" style={{ height }} />
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-xl text-xs">
      {label && <p className="font-semibold text-foreground mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color ?? p.fill }}>
          {p.name}: <span className="font-bold">{Number(p.value).toLocaleString()}</span>
        </p>
      ))}
    </div>
  )
}

export function ChartSection() {
  const { data: snapshot } = useMisSnapshot()
  const { data: monthlyRaw, isLoading: monthlyLoading } = useMonthlyCases(12)
  const { data: bankRaw, isLoading: bankLoading } = useBankWiseMis()
  const { data: engRaw, isLoading: engLoading } = useEngineerPerformance()

  // Monthly cases
  const monthlyData: any[] = Array.isArray(monthlyRaw) ? monthlyRaw.map((r: any) => ({
    month: r.month,
    cases: Number(r.cases),
  })) : []

  // Top 8 banks
  const bankData: any[] = Array.isArray(bankRaw)
    ? bankRaw.slice(0, 8).map((r: any) => ({
        bank: r.bank?.replace(' Bank', '').replace(' Ltd', '').replace(' Limited', '').trim(),
        cases: Number(r.cases),
        completed: Number(r.completed ?? 0),
      }))
    : []

  // Status donut from snapshot
  const statusData = snapshot ? [
    { name: 'New',         value: snapshot.newCases ?? 0,       color: CHART_COLORS.blue },
    { name: 'Assigned',    value: snapshot.assignedCases ?? 0,  color: CHART_COLORS.violet },
    { name: 'In Progress', value: snapshot.inProgressCases ?? 0,color: CHART_COLORS.amber },
    { name: 'Completed',   value: (snapshot.completedCases ?? 0) + (snapshot.finalizedCases ?? 0), color: CHART_COLORS.emerald },
    { name: 'On Hold',     value: snapshot.onHoldCases ?? 0,    color: CHART_COLORS.rose },
  ].filter(d => d.value > 0) : []

  // Engineer leaderboard
  const engineers: any[] = Array.isArray(engRaw) ? engRaw.slice(0, 6) : []
  const maxCases = engineers[0]?.cases ?? 1

  return (
    <div className="space-y-6">
      {/* Row 1: Monthly volume + Status donut */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Monthly Case Volume — 3/5 width */}
        <Card className="lg:col-span-3 border-border/60">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-blue-50 dark:bg-blue-950 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Monthly Case Volume</CardTitle>
                <p className="text-xs text-muted-foreground">Last 12 months</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {monthlyLoading ? <ChartSkeleton height={220} /> : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={monthlyData} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="caseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_COLORS.blue} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={CHART_COLORS.blue} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="cases"
                    stroke={CHART_COLORS.blue}
                    strokeWidth={2.5}
                    fill="url(#caseGrad)"
                    dot={false}
                    activeDot={{ r: 5, strokeWidth: 2, stroke: 'white', fill: CHART_COLORS.blue }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Case Status Donut — 2/5 width */}
        <Card className="lg:col-span-2 border-border/60">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-violet-50 dark:bg-violet-950 flex items-center justify-center">
                <Activity className="w-4 h-4 text-violet-600" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Case Status</CardTitle>
                <p className="text-xs text-muted-foreground">Current distribution</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {!snapshot ? <ChartSkeleton height={220} /> : (
              <div className="flex flex-col gap-3">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={72}
                      paddingAngle={2}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {statusData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {statusData.map((s) => (
                    <div key={s.name} className="flex items-center gap-1.5 min-w-0">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                      <span className="text-xs text-muted-foreground truncate">{s.name}</span>
                      <span className="text-xs font-semibold ml-auto">{s.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Top Banks + Engineer Leaderboard */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Banks */}
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Top Banks by Volume</CardTitle>
                <p className="text-xs text-muted-foreground">Cases processed</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {bankLoading ? <ChartSkeleton height={220} /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={bankData} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="bankGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={CHART_COLORS.emerald} stopOpacity={0.7} />
                      <stop offset="100%" stopColor={CHART_COLORS.emerald} stopOpacity={1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <YAxis
                    dataKey="bank"
                    type="category"
                    width={90}
                    tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="cases" name="Cases" fill="url(#bankGrad)" radius={[0, 6, 6, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Engineer Leaderboard */}
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-amber-50 dark:bg-amber-950 flex items-center justify-center">
                <Users className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Engineer Leaderboard</CardTitle>
                <p className="text-xs text-muted-foreground">Cases assigned all time</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            {engLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
              </div>
            ) : engineers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No data yet.</p>
            ) : (
              <div className="space-y-3">
                {engineers.map((eng: any, i: number) => {
                  const pct = Math.round((Number(eng.cases) / maxCases) * 100)
                  const completedPct = Number(eng.cases) > 0
                    ? Math.round((Number(eng.completed ?? 0) / Number(eng.cases)) * 100)
                    : 0
                  const medals = ['🥇', '🥈', '🥉']
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5">
                          <span>{medals[i] ?? `#${i + 1}`}</span>
                          <span className="font-medium truncate max-w-[140px]">{eng.engineer ?? 'Unknown'}</span>
                        </span>
                        <span className="text-muted-foreground font-medium shrink-0">
                          {Number(eng.cases).toLocaleString()} cases
                          <span className="ml-1 text-emerald-600">·{completedPct}%</span>
                        </span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            background: i === 0 ? CHART_COLORS.amber
                              : i === 1 ? CHART_COLORS.slate
                              : i === 2 ? CHART_COLORS.orange
                              : CHART_COLORS.blue,
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
