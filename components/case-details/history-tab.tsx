'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useCaseHistory } from '@/lib/api/hooks'
import { cn } from '@/lib/utils'
import {
  PlusCircle, UserCheck, CalendarClock, Navigation, MapPin,
  ShieldCheck, RotateCcw, CheckCircle2, Send, PauseCircle,
  XCircle, ClipboardEdit, User,
} from 'lucide-react'

interface HistoryEntry {
  id: string
  fromStatus: string | null
  toStatus: string
  reason: string | null
  notes: string | null
  changedAt: string
  changedBy: { id: string; name: string; email: string; role: string } | null
}

// ── Status display config ────────────────────────────────────────────────────
const STATUS_META: Record<string, {
  label: string
  icon: React.ReactNode
  dot: string
  badge: string
  action: string
}> = {
  NEW: {
    label: 'Case Created',
    icon: <PlusCircle className="w-4 h-4" />,
    dot: 'bg-blue-500',
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
    action: 'Created by',
  },
  ASSIGNED: {
    label: 'Engineer Assigned',
    icon: <UserCheck className="w-4 h-4" />,
    dot: 'bg-violet-500',
    badge: 'bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-300',
    action: 'Assigned by',
  },
  SITE_VISIT_SCHEDULED: {
    label: 'Site Visit Scheduled',
    icon: <CalendarClock className="w-4 h-4" />,
    dot: 'bg-indigo-500',
    badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300',
    action: 'Scheduled by',
  },
  SITE_VISIT_IN_PROGRESS: {
    label: 'Site Visit Started',
    icon: <Navigation className="w-4 h-4" />,
    dot: 'bg-sky-500',
    badge: 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300',
    action: 'Started by',
  },
  SITE_VISIT_COMPLETED: {
    label: 'Site Visit Completed',
    icon: <MapPin className="w-4 h-4" />,
    dot: 'bg-cyan-500',
    badge: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-300',
    action: 'Completed by',
  },
  UNDER_VERIFICATION: {
    label: 'Sent for Verification',
    icon: <ShieldCheck className="w-4 h-4" />,
    dot: 'bg-amber-500',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
    action: 'Submitted by',
  },
  REVISION_REQUESTED: {
    label: 'Revision Requested',
    icon: <RotateCcw className="w-4 h-4" />,
    dot: 'bg-orange-500',
    badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300',
    action: 'Requested by',
  },
  FINALIZED: {
    label: 'Report Finalized',
    icon: <CheckCircle2 className="w-4 h-4" />,
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300',
    action: 'Finalized by',
  },
  SENT_TO_BANK: {
    label: 'Sent to Bank',
    icon: <Send className="w-4 h-4" />,
    dot: 'bg-teal-500',
    badge: 'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300',
    action: 'Sent by',
  },
  ON_HOLD: {
    label: 'Placed On Hold',
    icon: <PauseCircle className="w-4 h-4" />,
    dot: 'bg-slate-400',
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    action: 'Held by',
  },
  CLOSED: {
    label: 'Case Closed',
    icon: <XCircle className="w-4 h-4" />,
    dot: 'bg-red-400',
    badge: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
    action: 'Closed by',
  },
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  COORDINATOR: 'Coordinator',
  ENGINEER: 'Engineer',
  VERIFIER: 'Verifier',
  ACCOUNTS: 'Accounts',
  HR: 'HR',
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return {
    date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
  }
}

function TimelineItem({ entry, isLast }: { entry: HistoryEntry; isLast: boolean }) {
  const meta = STATUS_META[entry.toStatus] ?? {
    label: entry.toStatus.replace(/_/g, ' '),
    icon: <ClipboardEdit className="w-4 h-4" />,
    dot: 'bg-primary',
    badge: 'bg-primary/10 text-primary',
    action: 'By',
  }

  const { date, time } = formatDateTime(entry.changedAt)
  const user = entry.changedBy

  return (
    <div className="flex gap-4">
      {/* Timeline spine */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0 shadow-sm',
          meta.dot,
        )}>
          {meta.icon}
        </div>
        {!isLast && <div className="w-px flex-1 bg-border mt-1 mb-0 min-h-6" />}
      </div>

      {/* Content */}
      <div className={cn('pb-8 flex-1 min-w-0', isLast && 'pb-0')}>
        {/* Header row */}
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="font-semibold text-sm">{meta.label}</span>
          <Badge
            variant="secondary"
            className={cn('text-[11px] h-5 px-1.5 font-medium border-0', meta.badge)}
          >
            {entry.toStatus.replace(/_/g, ' ')}
          </Badge>
          {entry.fromStatus && (
            <span className="text-[11px] text-muted-foreground">
              ← from {entry.fromStatus.replace(/_/g, ' ')}
            </span>
          )}
        </div>

        {/* Who + when */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
          <span className="flex items-center gap-1.5">
            <User className="w-3 h-3" />
            {user ? (
              <>
                <span className="font-medium text-foreground/80">{user.name}</span>
                {user.role && (
                  <span className="text-muted-foreground/70">
                    ({ROLE_LABELS[user.role] ?? user.role})
                  </span>
                )}
              </>
            ) : (
              <span className="italic">System</span>
            )}
          </span>
          <span className="text-muted-foreground/50">·</span>
          <span>{date}</span>
          <span className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded">{time}</span>
        </div>

        {/* Reason / notes */}
        {(entry.reason || entry.notes) && (
          <p className="mt-2 text-xs text-muted-foreground bg-muted/60 rounded-lg px-3 py-2 leading-relaxed">
            {entry.reason || entry.notes}
          </p>
        )}
      </div>
    </div>
  )
}

function TimelineSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="flex gap-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-20 rounded-full" />
            </div>
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function HistoryTab({ caseId }: { caseId: string }) {
  const { data: history, isLoading, error } = useCaseHistory(caseId)

  const entries: HistoryEntry[] = Array.isArray(history) ? history : []

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Audit Trail</CardTitle>
          {!isLoading && entries.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {entries.length} event{entries.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Complete record of who did what and when on this case
        </p>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <TimelineSkeleton />
        ) : error ? (
          <p className="text-sm text-destructive py-4">Failed to load history.</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No history recorded yet.</p>
        ) : (
          <div>
            {entries.map((entry, i) => (
              <TimelineItem
                key={entry.id}
                entry={entry}
                isLast={i === entries.length - 1}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
