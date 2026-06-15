'use client'

import { useState, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Case, CaseStatus } from '@/types'
import { StatusBadge } from '@/components/cases/status-badge'
import { GripVertical, Calendar, User, Briefcase } from 'lucide-react'
import { cn } from '@/lib/utils'

interface KanbanBoardProps {
  cases: Case[]
}

const COLUMNS: { status: CaseStatus; label: string; color: string }[] = [
  { status: 'new', label: 'New', color: 'bg-blue-50 dark:bg-blue-950' },
  { status: 'assigned', label: 'Assigned', color: 'bg-indigo-50 dark:bg-indigo-950' },
  { status: 'site_visit_scheduled', label: 'Site Visit Scheduled', color: 'bg-purple-50 dark:bg-purple-950' },
  { status: 'site_visit_completed', label: 'Site Visit Completed', color: 'bg-pink-50 dark:bg-pink-950' },
  { status: 'under_verification', label: 'Under Verification', color: 'bg-amber-50 dark:bg-amber-950' },
  { status: 'finalized', label: 'Finalized', color: 'bg-emerald-50 dark:bg-emerald-950' },
  { status: 'on_hold', label: 'On Hold', color: 'bg-slate-50 dark:bg-slate-900' },
]

const priorityColors: Record<string, string> = {
  low: 'border-l-4 border-l-emerald-500',
  medium: 'border-l-4 border-l-amber-500',
  high: 'border-l-4 border-l-orange-500',
  critical: 'border-l-4 border-l-red-500',
}

export function KanbanBoard({ cases }: KanbanBoardProps) {
  const [cardData, setCardData] = useState(cases)
  const [draggedCard, setDraggedCard] = useState<Case | null>(null)
  const [hoveredColumn, setHoveredColumn] = useState<CaseStatus | null>(null)

  const getCasesByStatus = useCallback(
    (status: CaseStatus) => cardData.filter((c) => c.status === status),
    [cardData]
  )

  const handleDragStart = (card: Case) => {
    setDraggedCard(card)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (status: CaseStatus) => {
    if (draggedCard) {
      const updated = cardData.map((c) =>
        c.id === draggedCard.id ? { ...c, status, lastUpdated: new Date().toISOString().split('T')[0] } : c
      )
      setCardData(updated)
      setDraggedCard(null)
      setHoveredColumn(null)
    }
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-full">
        {COLUMNS.map((column) => {
          const columnCases = getCasesByStatus(column.status)
          const isHovered = hoveredColumn === column.status

          return (
            <div key={column.status} className="flex-shrink-0 w-80 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Column header */}
              <div className={cn(
                'mb-4 p-3 rounded-lg transition-all duration-200',
                isHovered && 'bg-primary/5 shadow-sm'
              )}>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-sm text-foreground">{column.label}</h3>
                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                    {columnCases.length}
                  </Badge>
                </div>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={(e) => {
                  handleDragOver(e)
                  setHoveredColumn(column.status)
                }}
                onDragLeave={() => setHoveredColumn(null)}
                onDrop={() => handleDrop(column.status)}
                className={cn(
                  'rounded-lg p-3 min-h-96 border-2 transition-all duration-200',
                  isHovered
                    ? 'border-primary/50 bg-primary/5 shadow-md scale-[1.02]'
                    : 'border-dashed border-border bg-muted/20',
                  column.color
                )}
              >
                <div className="space-y-3">
                  {columnCases.map((caseItem, index) => (
                    <Card
                      key={caseItem.id}
                      draggable
                      onDragStart={() => handleDragStart(caseItem)}
                      className={cn(
                        'p-3 cursor-move transition-all duration-200 hover:shadow-lg hover:scale-[1.02] stagger-item animate-in fade-in slide-in-from-bottom-4',
                        priorityColors[caseItem.priority],
                        draggedCard?.id === caseItem.id && 'opacity-50 shadow-xl scale-95'
                      )}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      {/* Case ID with drag handle */}
                      <div className="flex items-start gap-2 mb-2">
                        <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <span className="font-semibold text-sm text-foreground">{caseItem.id}</span>
                      </div>

                      {/* Property address */}
                      <p className="text-xs text-muted-foreground mb-3 line-clamp-2 pl-6">
                        {caseItem.propertyAddress}
                      </p>

                      {/* Details grid */}
                      <div className="space-y-2 mb-3 pl-6">
                        <div className="flex items-center gap-2 text-xs">
                          <Briefcase className="w-3 h-3 text-primary/60 flex-shrink-0" />
                          <span className="font-medium">{caseItem.bank}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <User className="w-3 h-3 text-primary/60 flex-shrink-0" />
                          <span className="text-muted-foreground">{caseItem.engineer}</span>
                        </div>
                      </div>

                      {/* Priority & Amount */}
                      <div className="flex items-center justify-between gap-2 pl-6">
                        <Badge 
                          className={cn(
                            'capitalize text-xs font-medium',
                            caseItem.priority === 'critical' && 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
                            caseItem.priority === 'high' && 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
                            caseItem.priority === 'medium' && 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
                            caseItem.priority === 'low' && 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300'
                          )}
                          variant="secondary"
                        >
                          {caseItem.priority}
                        </Badge>
                        {caseItem.amount && (
                          <span className="text-xs font-semibold text-primary">
                            ₹{(caseItem.amount / 100000).toFixed(1)}L
                          </span>
                        )}
                      </div>
                    </Card>
                  ))}

                  {columnCases.length === 0 && (
                    <div className={cn(
                      'text-center py-12 text-muted-foreground text-xs transition-colors duration-200',
                      isHovered && 'text-primary/60'
                    )}>
                      {draggedCard ? 'Drop case here' : 'No cases'}
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
