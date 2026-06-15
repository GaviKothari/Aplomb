'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export function StatCardSkeleton() {
  return (
    <Card className="border border-border/50 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24 rounded" />
          <Skeleton className="h-10 w-10 rounded-lg" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16 rounded mb-2" />
        <Skeleton className="h-3 w-12 rounded-full" />
      </CardContent>
    </Card>
  )
}

export function ChartSkeleton() {
  return (
    <Card className="border border-border/50 shadow-sm">
      <CardHeader>
        <Skeleton className="h-5 w-40 rounded" />
        <Skeleton className="h-3 w-56 rounded mt-2" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-end gap-2 h-24">
              <Skeleton className="h-full flex-1 rounded-t" />
              <Skeleton className="h-4/5 flex-1 rounded-t" />
              <Skeleton className="h-3/5 flex-1 rounded-t" />
              <Skeleton className="h-2/3 flex-1 rounded-t" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function TableRowSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 rounded-lg border border-border/50 animate-shimmer">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4 rounded" />
            <Skeleton className="h-3 w-1/2 rounded" />
          </div>
          <Skeleton className="h-8 w-24 rounded" />
        </div>
      ))}
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-enter">
      {/* Header */}
      <div>
        <Skeleton className="h-10 w-64 rounded mb-2" />
        <Skeleton className="h-4 w-96 rounded" />
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>

      {/* Table */}
      <div>
        <Skeleton className="h-6 w-48 rounded mb-4" />
        <TableRowSkeleton />
      </div>
    </div>
  )
}
