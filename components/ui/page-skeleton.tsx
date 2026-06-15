'use client'

import { Skeleton } from './skeleton'

/** Full-page table skeleton — mimics a header + filter row + N data rows */
export function TablePageSkeleton({ rows = 10, cols = 6 }: { rows?: number; cols?: number }) {
  const colWidths = ['w-24', 'w-40', 'w-32', 'w-28', 'w-20', 'w-16', 'w-24', 'w-20']
  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex gap-3">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-9 w-28" />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/50 overflow-hidden">
        {/* Column headers */}
        <div className="flex items-center gap-4 px-4 py-3 bg-muted/30 border-b border-border/50">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className={`h-3.5 ${colWidths[i % colWidths.length]}`} />
          ))}
        </div>
        {/* Data rows */}
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-4 py-3.5 border-b border-border/30 last:border-0"
            style={{ opacity: 1 - i * 0.06 }}
          >
            {Array.from({ length: cols }).map((_, j) => (
              <Skeleton
                key={j}
                className={`h-4 ${colWidths[(j + i) % colWidths.length]}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/** Card grid skeleton — for dashboards with stat cards */
export function CardGridSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="space-y-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className={`grid gap-4 md:grid-cols-2 lg:grid-cols-${Math.min(cards, 6)}`}>
        {Array.from({ length: cards }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/50 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Form page skeleton */
export function FormPageSkeleton({ fields = 8 }: { fields?: number }) {
  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-2xl">
      <div className="space-y-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        ))}
      </div>
      <div className="flex gap-3 pt-2">
        <Skeleton className="h-10 w-32 rounded-md" />
        <Skeleton className="h-10 w-24 rounded-md" />
      </div>
    </div>
  )
}

/** Detail page skeleton (e.g. single case view) */
export function DetailPageSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-4">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="ml-auto flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border/50 p-5 space-y-4">
              <Skeleton className="h-5 w-32" />
              <div className="grid gap-4 sm:grid-cols-2">
                {Array.from({ length: 6 }).map((_, j) => (
                  <div key={j} className="space-y-1.5">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-5 w-36" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border/50 p-5 space-y-3">
              <Skeleton className="h-5 w-28" />
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="flex justify-between">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
