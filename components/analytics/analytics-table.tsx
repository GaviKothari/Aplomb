'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

interface AnalyticsTableRow {
  [key: string]: string | number | React.ReactNode
}

interface AnalyticsTableProps {
  title: string
  headers: string[]
  data: AnalyticsTableRow[]
  enableHover?: boolean
}

export function AnalyticsTable({ title, headers, data, enableHover = true }: AnalyticsTableProps) {
  return (
    <Card className="border border-border/50 shadow-sm">
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                {headers.map((header) => (
                  <TableHead key={header} className="text-xs font-semibold text-muted-foreground">
                    {header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, idx) => (
                <TableRow
                  key={idx}
                  className={
                    enableHover
                      ? 'border-border/50 hover:bg-primary/5 transition-colors duration-200 cursor-pointer'
                      : 'border-border/50'
                  }
                >
                  {headers.map((header) => (
                    <TableCell key={`${idx}-${header}`} className="text-sm">
                      {row[header]}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
