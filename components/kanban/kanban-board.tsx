'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { GripVertical, Calendar, User, Briefcase, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUpdateCaseStatus } from '@/lib/api/hooks'
import { toast } from 'sonner'

interface ApiCase {
  id: string
  caseNumber: string
  status: string
  priority: string
  propertyAddress: string
  propertyCity?: string
  caseType?: string
  organization?: { name: string }
  engineer?: { id: string; name: string }
  createdAt: string
  siteVisitDate?: string
  totalMarketValue?: number | string
}

interface KanbanBoardProps {
  cases: ApiCase[]
}

const COLUMNS: { status: string; label: string; bg: string; border: string }[] = [
  { status: 'NEW',                    label: 'New',               bg: 'bg-blue-50 dark:bg-blue-950/40',    border: 'border-blue-200 dark:border-blue-800' },
  { status: 'ASSIGNED',               label: 'Assigned',          bg: 'bg-violet-50 dark:bg-violet-950/40', border: 'border-violet-200 dark:border-violet-800' },
  { status: 'SITE_VISIT_SCHEDULED',   label: 'Visit Scheduled',   bg: 'bg-indigo-50 dark:bg-indigo-950/40', border: 'border-indigo-200 dark:border-indigo-800' },
  { status: 'SITE_VISIT_IN_PROGRESS', label: 'Visit In Progress', bg: 'bg-sky-50 dark:bg-sky-950/40',      border: 'border-sky-200 dark:border-sky-800' },
  { status: 'SITE_VISIT_COMPLETED',   label: 'Visit Completed',   bg: 'bg-cyan-50 dark:bg-cyan-950/40',    border: 'border-cyan-200 dark:border-cyan-800' },
  { status: 'UNDER_VERIFICATION',     label: 'Under Verification',bg: 'bg-amber-50 dark:bg-amber-950/40',  border: 'border-amber-200 dark:border-amber-800' },
  { status: 'REVISION_REQUESTED',     label: 'Revision Requested',bg: 'bg-orange-50 dark:bg-orange-950/40',border: 'border-orange-200 dark:border-orange-800' },
  { status: 'FINALIZED',              label: 'Finalized',         bg: 'bg-emerald-50 dark:bg-emerald-950/40',border: 'border-emerald-200 dark:border-emerald-800' },
  { status: 'ON_HOLD',                label: 'On Hold',           bg: 'bg-slate-50 dark:bg-slate-900/40',  border: 'border-slate-200 dark:border-slate-700' },
]

const priorityLeft: Record<string, string> = {
  CRITICAL: 'border-l-4 border-l-red-500',
  HIGH:     'border-l-4 border-l-orange-500',
  MEDIUM:   'border-l-4 border-l-amber-400',
  LOW:      'border-l-4 border-l-emerald-400',
}

const priorityBadge: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-300',
  HIGH:     'bg-orange-100 text-orange-800 dark:bg-orange-900/60 dark:text-orange-300',
  MEDIUM:   'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300',
  LOW:      'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300',
}

function formatValue(v?: number | string): string | null {
  const n = typeof v === 'string' ? parseFloat(v) : v
  if (!n || isNaN(n)) return null
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`
  return `₹${n.toLocaleString('en-IN')}`
}

function formatDate(d?: string): string | null {
  if (!d) return null
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

export function KanbanBoard({ cases }: KanbanBoardProps) {
  const router = useRouter()
  const [localCases, setLocalCases] = useState<ApiCase[]>(cases)
  const [hoveredCol, setHoveredCol] = useState<string | null>(null)
  const draggedRef = useRef<ApiCase | null>(null)
  const prevStatusRef = useRef<string>('')

  useEffect(() => {
    setLocalCases(cases)
  }, [cases])

  const updateStatus = useUpdateCaseStatus()

  const byStatus = useCallback(
    (status: string) => localCases.filter((c) => c.status === status),
    [localCases],
  )

  const handleDragStart = (c: ApiCase) => {
    draggedRef.current = c
    prevStatusRef.current = c.status
  }

  const handleDrop = (targetStatus: string) => {
    const dragged = draggedRef.current
    if (!dragged || dragged.status === targetStatus) {
      draggedRef.current = null
      setHoveredCol(null)
      return
    }

    // Optimistic update
    setLocalCases((prev) =>
      prev.map((c) => (c.id === dragged.id ? { ...c, status: targetStatus } : c)),
    )
    draggedRef.current = null
    setHoveredCol(null)

    updateStatus.mutate(
      { id: dragged.id, status: targetStatus },
      {
        onError: () => {
          // Revert
          setLocalCases((prev) =>
            prev.map((c) =>
              c.id === dragged.id ? { ...c, status: prevStatusRef.current } : c,
            ),
          )
          toast.error('Failed to update status — change reverted')
        },
      },
    )
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-3 min-w-max">
        {COLUMNS.map((col) => {
          const colCases = byStatus(col.status)
          const isHovered = hoveredCol === col.status

          return (
            <div key={col.status} className="flex-shrink-0 w-72">
              {/* Column header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-xs font-semibold text-foreground tracking-wide uppercase">
                  {col.label}
                </span>
                <Badge
                  variant="secondary"
                  className="text-xs h-5 min-w-5 flex items-center justify-center rounded-full"
                >
                  {colCases.length}
                </Badge>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                  setHoveredCol(col.status)
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setHoveredCol(null)
                  }
                }}
                onDrop={() => handleDrop(col.status)}
                className={cn(
                  'rounded-xl border-2 p-2 min-h-96 transition-all duration-150',
                  col.bg,
                  isHovered
                    ? 'border-primary/60 shadow-md ring-1 ring-primary/20 scale-[1.01]'
                    : col.border + ' border-dashed',
                )}
              >
                <div className="space-y-2">
                  {colCases.map((c, i) => (
                    <Card
                      key={c.id}
                      draggable
                      onDragStart={() => handleDragStart(c)}
                      onClick={() => router.push(`/operations/cases/${c.id}`)}
                      className={cn(
                        'p-3 cursor-grab active:cursor-grabbing select-none',
                        'transition-all duration-150 hover:shadow-md hover:-translate-y-0.5',
                        'animate-in fade-in slide-in-from-bottom-2',
                        priorityLeft[c.priority] ?? 'border-l-4 border-l-slate-300',
                      )}
                      style={{ animationDelay: `${i * 30}ms` }}
                    >
                      {/* Header row */}
                      <div className="flex items-start gap-1.5 mb-1.5">
                        <GripVertical className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <span className="font-semibold text-xs text-foreground leading-tight">
                          {c.caseNumber}
                        </span>
                      </div>

                      {/* Address */}
                      <p className="text-xs text-muted-foreground mb-2 pl-5 line-clamp-2 leading-snug">
                        {c.propertyAddress}
                      </p>

                      {/* Meta rows */}
                      <div className="space-y-1 mb-2 pl-5">
                        {c.organization?.name && (
                          <div className="flex items-center gap-1.5 text-xs">
                            <Briefcase className="w-3 h-3 text-primary/50 flex-shrink-0" />
                            <span className="font-medium truncate">{c.organization.name}</span>
                          </div>
                        )}
                        {c.engineer?.name && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <User className="w-3 h-3 text-primary/50 flex-shrink-0" />
                            <span className="truncate">{c.engineer.name}</span>
                          </div>
                        )}
                        {c.propertyCity && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3 text-primary/50 flex-shrink-0" />
                            <span className="truncate">{c.propertyCity}</span>
                          </div>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between gap-1 pl-5">
                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-[10px] h-4 px-1.5 capitalize font-medium',
                            priorityBadge[c.priority] ?? '',
                          )}
                        >
                          {c.priority?.toLowerCase()}
                        </Badge>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          {formatValue(c.totalMarketValue) && (
                            <span className="font-semibold text-primary/80">
                              {formatValue(c.totalMarketValue)}
                            </span>
                          )}
                          {formatDate(c.siteVisitDate ?? c.createdAt) && (
                            <span className="flex items-center gap-0.5">
                              <Calendar className="w-2.5 h-2.5" />
                              {formatDate(c.siteVisitDate ?? c.createdAt)}
                            </span>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}

                  {colCases.length === 0 && (
                    <div
                      className={cn(
                        'text-center py-10 text-xs text-muted-foreground/60',
                        isHovered && 'text-primary/60 font-medium',
                      )}
                    >
                      {isHovered ? 'Drop here' : 'Empty'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
