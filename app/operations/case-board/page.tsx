'use client'

import { useState } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { KanbanBoard } from '@/components/kanban/kanban-board'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useCases } from '@/lib/api/hooks'
import { Search, RefreshCw, Kanban } from 'lucide-react'

const PRIORITY_OPTIONS = [
  { value: 'all', label: 'All Priorities' },
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
]

function BoardSkeleton() {
  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex-shrink-0 w-72">
          <div className="flex items-center justify-between mb-3 px-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-5 rounded-full" />
          </div>
          <div className="rounded-xl border-2 border-dashed border-border bg-muted/20 p-2 min-h-96 space-y-2">
            {Array.from({ length: i % 3 === 0 ? 3 : i % 2 === 0 ? 2 : 1 }).map((_, j) => (
              <Skeleton key={j} className="h-28 w-full rounded-lg" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function KanbanPage() {
  const [search, setSearch] = useState('')
  const [priority, setPriority] = useState('all')

  const { data, isLoading, refetch, isRefetching } = useCases({
    limit: 500,
    search: search || undefined,
    priority: priority === 'all' ? undefined : priority,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  })

  const cases = data?.data ?? []
  const total = data?.total ?? 0

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Kanban className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Case Board</h1>
              <p className="text-sm text-muted-foreground">
                {isLoading ? 'Loading…' : `${total} case${total !== 1 ? 's' : ''} across all stages`}
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="gap-2 self-start sm:self-auto"
          >
            <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search cases…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 w-56 text-sm"
            />
          </div>

          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="h-8 w-40 text-sm">
              <SelectValue placeholder="All Priorities" />
            </SelectTrigger>
            <SelectContent>
              {PRIORITY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(search || priority) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={() => { setSearch(''); setPriority('all') }}
            >
              Clear filters
            </Button>
          )}

          {!isLoading && cases.length > 0 && (
            <Badge variant="secondary" className="ml-auto text-xs">
              {cases.length} shown
            </Badge>
          )}
        </div>

        {/* Board */}
        {isLoading ? (
          <BoardSkeleton />
        ) : cases.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Kanban className="w-10 h-10 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground font-medium">No cases found</p>
            {(search || priority) && (
              <p className="text-sm text-muted-foreground/70 mt-1">Try adjusting your filters</p>
            )}
          </div>
        ) : (
          <KanbanBoard cases={cases} />
        )}
      </div>
    </AppLayout>
  )
}
