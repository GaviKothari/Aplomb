'use client'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Case } from '@/types'

interface EnhancedTableProps {
  data: Case[]
  columns: {
    key: keyof Case
    label: string
    render?: (value: any) => React.ReactNode
  }[]
  striped?: boolean
}

const statusColors = {
  new: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  assigned: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  site_visit_scheduled: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  site_visit_completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  under_verification: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  finalized: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  on_hold: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

export function EnhancedTable({ data, columns, striped = true }: EnhancedTableProps) {
  return (
    <div className="rounded-lg border border-border/50 overflow-hidden bg-card/50 backdrop-blur">
      <Table>
        <TableHeader>
          <TableRow className="border-border/50 bg-muted/30 hover:bg-muted/30">
            {columns.map((col) => (
              <TableHead key={String(col.key)} className="font-semibold text-foreground">
                {col.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, idx) => (
            <TableRow
              key={idx}
              className={cn(
                'border-border/50 transition-all duration-150 hover:bg-muted/40',
                striped && idx % 2 === 0 && 'bg-muted/20'
              )}
            >
              {columns.map((col) => {
                const value = row[col.key]
                return (
                  <TableCell key={String(col.key)} className="py-4">
                    {col.render ? (
                      col.render(value)
                    ) : col.key === 'status' ? (
                      <Badge className={cn('capitalize', statusColors[value as keyof typeof statusColors])}>
                        {String(value).replace(/_/g, ' ')}
                      </Badge>
                    ) : (
                      String(value)
                    )}
                  </TableCell>
                )
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
