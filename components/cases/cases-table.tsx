'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Case } from '@/types'
import { StatusBadge } from './status-badge'
import { CaseFilters, FilterState } from './case-filters'

interface CasesTableProps {
  cases: any[]  // accepts raw API shape or legacy mock shape
}

/** Normalise a raw API case to the flat string fields this component expects */
function normalise(c: any): any {
  return {
    ...c,
    bank:        typeof c.bank === 'string' ? c.bank : (c.organization?.name ?? '—'),
    engineer:    typeof c.engineer === 'string' ? c.engineer : (c.engineer?.name ?? '—'),
    priority:    c.priority?.toLowerCase() ?? 'low',
    createdDate: c.createdDate ?? c.createdAt,
    lastUpdated: c.lastUpdated ?? c.updatedAt,
  }
}

const priorityColors: Record<string, string> = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800',
  critical: 'bg-red-200 text-red-900',
}

export function CasesTable({ cases }: CasesTableProps) {
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    statuses: [],
    banks: [],
    priorities: [],
    engineers: [],
  })

  const filteredCases = useMemo(() => {
    return cases.map(normalise).filter((caseItem) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        if (
          !caseItem.id.toLowerCase().includes(searchLower) &&
          !caseItem.propertyAddress.toLowerCase().includes(searchLower)
        ) {
          return false
        }
      }

      // Status filter
      if (filters.statuses.length > 0 && !filters.statuses.includes(caseItem.status)) {
        return false
      }

      // Bank filter
      if (filters.banks.length > 0 && !filters.banks.includes(caseItem.bank)) {
        return false
      }

      // Priority filter
      if (filters.priorities.length > 0 && !filters.priorities.includes(caseItem.priority)) {
        return false
      }

      // Engineer filter
      if (filters.engineers.length > 0 && !filters.engineers.includes(caseItem.engineer)) {
        return false
      }

      return true
    })
  }, [cases, filters])

  return (
    <div className="space-y-4">
      <CaseFilters onFilterChange={setFilters} />

      <Card className="border-0 shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="text-xs font-semibold">Case ID</TableHead>
                <TableHead className="text-xs font-semibold">Property Address</TableHead>
                <TableHead className="text-xs font-semibold">Bank</TableHead>
                <TableHead className="text-xs font-semibold">Engineer</TableHead>
                <TableHead className="text-xs font-semibold">Status</TableHead>
                <TableHead className="text-xs font-semibold">Priority</TableHead>
                <TableHead className="text-xs font-semibold">Created Date</TableHead>
                <TableHead className="text-xs font-semibold">Last Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCases.length > 0 ? (
                filteredCases.map((caseItem) => (
                  <TableRow key={caseItem.id} className="border-border hover:bg-muted/50">
                    <TableCell className="text-sm font-medium">
                      <Link href={`/operations/cases/${caseItem.id}`} className="text-primary hover:underline font-mono">
                        {caseItem.caseNumber ?? caseItem.id}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {caseItem.propertyAddress}
                    </TableCell>
                    <TableCell className="text-sm">{caseItem.bank}</TableCell>
                    <TableCell className="text-sm">{caseItem.engineer}</TableCell>
                    <TableCell>
                      <StatusBadge status={caseItem.status} />
                    </TableCell>
                    <TableCell>
                      <Badge className={priorityColors[caseItem.priority] ?? 'bg-gray-100 text-gray-700'}>
                        {caseItem.priority.charAt(0).toUpperCase() + caseItem.priority.slice(1).toLowerCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {caseItem.createdDate ? new Date(caseItem.createdDate).toLocaleDateString('en-IN') : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {caseItem.lastUpdated ? new Date(caseItem.lastUpdated).toLocaleDateString('en-IN') : '—'}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No cases found matching your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <div className="text-sm text-muted-foreground">
        Showing {filteredCases.length} of {cases.length} cases
      </div>
    </div>
  )
}
