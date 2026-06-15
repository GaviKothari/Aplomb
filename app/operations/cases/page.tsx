'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { CasesTable } from '@/components/cases/cases-table'
import { Button } from '@/components/ui/button'
import { Plus, RefreshCw } from 'lucide-react'
import { useCases } from '@/lib/api/hooks'
import { TablePageSkeleton } from '@/components/ui/page-skeleton'

export default function CasesPage() {
  const router = useRouter()
  const [filters, setFilters] = useState({ page: 1, limit: 20 })

  const { data, isLoading, refetch, isRefetching } = useCases(filters)

  // Fall back to empty array while loading
  const cases = data?.data ?? []

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Cases</h1>
            <p className="text-muted-foreground mt-2">{data?.total ?? 0} total cases</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button className="gap-2" onClick={() => router.push('/operations/cases/new')}>
              <Plus className="w-4 h-4" />
              New Case
            </Button>
          </div>
        </div>

        {isLoading ? (
          <TablePageSkeleton rows={12} cols={7} />
        ) : (
          <div className="animate-in fade-in duration-300">
            <CasesTable cases={cases} />
          </div>
        )}
      </div>
    </AppLayout>
  )
}

