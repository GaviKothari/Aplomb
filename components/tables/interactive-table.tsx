'use client'

import { useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

interface InteractiveTableProps {
  columns: {
    key: string
    label: string
    width?: string
  }[]
  data: Record<string, any>[]
  onRowClick?: (row: Record<string, any>) => void
  rowClassName?: string
}

export function InteractiveTable({
  columns,
  data,
  onRowClick,
  rowClassName,
}: InteractiveTableProps) {
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null)

  return (
    <div className="rounded-lg border border-border/50 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-secondary/30 hover:bg-secondary/40 transition-colors duration-200">
            {columns.map((col) => (
              <TableHead
                key={col.key}
                className="text-xs font-semibold uppercase tracking-wider text-foreground/70"
                style={{ width: col.width }}
              >
                {col.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, idx) => (
            <TableRow
              key={idx}
              onClick={() => onRowClick?.(row)}
              onMouseEnter={() => setHoveredRowId(String(idx))}
              onMouseLeave={() => setHoveredRowId(null)}
              className={cn(
                'transition-all duration-200 border-border/50',
                hoveredRowId === String(idx) && 'bg-secondary/40 shadow-sm',
                onRowClick && 'cursor-pointer',
                rowClassName
              )}
            >
              {columns.map((col) => (
                <TableCell
                  key={`${idx}-${col.key}`}
                  className={cn(
                    'transition-colors duration-200',
                    hoveredRowId === String(idx) && 'text-foreground'
                  )}
                >
                  {row[col.key]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
