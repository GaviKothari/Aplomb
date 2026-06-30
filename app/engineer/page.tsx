'use client'

import { useUser } from '@clerk/nextjs'
import { useCases, useTodayAttendance, useMe } from '@/lib/api/hooks'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import { Briefcase, Clock, ChevronRight, MapPin, CheckCircle2, AlertCircle, PlayCircle } from 'lucide-react'

const STATUS_COLOR: Record<string, string> = {
  ASSIGNED:              'bg-blue-100 text-blue-800',
  SITE_VISIT_SCHEDULED:  'bg-amber-100 text-amber-800',
  SITE_VISIT_IN_PROGRESS:'bg-purple-100 text-purple-800',
  SITE_VISIT_COMPLETED:  'bg-emerald-100 text-emerald-800',
  REVISION_REQUESTED:    'bg-red-100 text-red-800',
  NEW:                   'bg-slate-100 text-slate-700',
}
const STATUS_LABEL: Record<string, string> = {
  ASSIGNED: 'Assigned', SITE_VISIT_SCHEDULED: 'Scheduled',
  SITE_VISIT_IN_PROGRESS: 'In Progress', SITE_VISIT_COMPLETED: 'Completed',
  REVISION_REQUESTED: 'Revision', NEW: 'New',
}

function fmt(t: string) {
  return new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

function isToday(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
}

export default function EngineerHomePage() {
  const { user } = useUser()
  const { data: me } = useMe()
  const { data: attendance, isLoading: loadingAtt } = useTodayAttendance()
  const { data: casesData, isLoading: loadingCases } = useCases({ limit: 50, engineerId: me?.id })

  const cases: any[] = casesData?.data ?? []
  const active   = cases.filter((c: any) => ['ASSIGNED', 'SITE_VISIT_SCHEDULED', 'SITE_VISIT_IN_PROGRESS'].includes((c.status ?? '').toUpperCase()))
  const done     = cases.filter((c: any) => (c.status ?? '').toUpperCase() === 'SITE_VISIT_COMPLETED')
  const revision = cases.filter((c: any) => (c.status ?? '').toUpperCase() === 'REVISION_REQUESTED')
  const todayVisits = active.filter((c: any) => c.siteVisitDate && isToday(c.siteVisitDate))

  const isPunchedIn = attendance?.punchIn && !attendance?.punchOut
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white px-5 pt-12 pb-8">
        <p className="text-blue-200 text-sm">{greeting} 👋</p>
        <h1 className="text-2xl font-bold mt-1">{user?.firstName ?? 'Engineer'}</h1>
        <p className="text-blue-200 text-xs mt-1">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>

        <Link href="/engineer/punch-in-out">
          <div className="mt-4 flex items-center justify-between bg-white/10 backdrop-blur rounded-2xl px-4 py-3">
            <div className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full ${isPunchedIn ? 'bg-emerald-400 animate-pulse' : 'bg-white/40'}`} />
              <div>
                <p className="text-sm font-semibold">
                  {loadingAtt ? '...' : isPunchedIn ? 'Punched In' : 'Not Punched In'}
                </p>
                {isPunchedIn && attendance?.punchIn && (
                  <p className="text-xs text-blue-200">Since {fmt(attendance.punchIn)}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-blue-200">{isPunchedIn ? 'Tap to punch out' : 'Tap to punch in'}</span>
              <ChevronRight className="w-4 h-4 text-blue-200" />
            </div>
          </div>
        </Link>
      </div>

      {/* Stat pills */}
      <div className="px-5 -mt-4">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Active',   count: loadingCases ? null : active.length,   color: 'bg-blue-50',    text: 'text-blue-700',    icon: PlayCircle },
            { label: 'Done',     count: loadingCases ? null : done.length,     color: 'bg-emerald-50', text: 'text-emerald-700', icon: CheckCircle2 },
            { label: 'Revision', count: loadingCases ? null : revision.length, color: 'bg-red-50',     text: 'text-red-700',     icon: AlertCircle },
          ].map(({ label, count, color, text, icon: Icon }) => (
            <div key={label} className={`${color} rounded-2xl p-3 flex flex-col items-center gap-1 border border-white shadow-sm`}>
              <Icon className={`w-4 h-4 ${text}`} />
              <p className={`text-2xl font-bold ${text}`}>{count ?? '—'}</p>
              <p className={`text-[11px] font-medium ${text} opacity-80`}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Today's visits callout */}
      {todayVisits.length > 0 && (
        <div className="px-5 mt-6">
          <h2 className="font-semibold text-base text-gray-900 mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse inline-block" />
            Today's Visits
          </h2>
          <div className="space-y-2">
            {todayVisits.map((c: any) => {
              const status = (c.status ?? '').toUpperCase()
              return (
                <Link key={c.id} href={`/engineer/cases/${c.id}`}>
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 active:scale-[0.98] transition-transform">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900 line-clamp-1">{c.ownerName ?? 'Unknown Owner'}</p>
                        <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{c.propertyAddress}</p>
                      </div>
                      <Badge className={`text-[10px] shrink-0 ${STATUS_COLOR[status] ?? 'bg-slate-100 text-slate-700'}`}>
                        {STATUS_LABEL[status] ?? status}
                      </Badge>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* All active cases */}
      <div className="px-5 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-base text-gray-900">My Cases</h2>
          <Link href="/engineer/cases" className="text-sm text-blue-600 font-medium">
            View all →
          </Link>
        </div>

        {loadingCases ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
          </div>
        ) : cases.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
              <Briefcase className="w-7 h-7 text-gray-400" />
            </div>
            <p className="font-medium text-gray-900">No cases assigned yet</p>
            <p className="text-sm text-gray-500">Your coordinator will assign cases here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {active.concat(revision).slice(0, 6).map((c: any) => {
              const status = (c.status ?? '').toUpperCase()
              return (
                <Link key={c.id} href={`/engineer/cases/${c.id}`}>
                  <div className="bg-white border border-gray-200 rounded-2xl p-4 active:scale-[0.98] transition-transform shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-gray-400">
                            {c.referenceNumber ?? c.caseNumber ?? c.id.slice(0,8).toUpperCase()}
                          </span>
                          <Badge className={`text-[10px] px-2 py-0 ${STATUS_COLOR[status] ?? 'bg-slate-100 text-slate-700'}`}>
                            {STATUS_LABEL[status] ?? status}
                          </Badge>
                        </div>
                        <p className="text-sm font-semibold text-gray-900 line-clamp-1">
                          {c.ownerName ?? 'Unknown Owner'}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <p className="text-xs text-gray-500 line-clamp-1">
                            {c.propertyAddress ?? c.address ?? 'No address'}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0 mt-0.5" />
                    </div>
                    {c.siteVisitDate && (
                      <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <p className="text-[11px] text-gray-500">
                          Visit: {new Date(c.siteVisitDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
      <div className="h-6" />
    </div>
  )
}
