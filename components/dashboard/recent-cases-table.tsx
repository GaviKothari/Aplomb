'use client'

import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronRight } from 'lucide-react'
import { Case } from '@/types'

interface RecentCasesTableProps {
  cases: Case[]
}

const statusColors: Record<string, { bg: string; text: string }> = {
  new: { bg: 'bg-blue-100', text: 'text-blue-800' },
  assigned: { bg: 'bg-purple-100', text: 'text-purple-800' },
  site_visit_scheduled: { bg: 'bg-indigo-100', text: 'text-indigo-800' },
  site_visit_completed: { bg: 'bg-cyan-100', text: 'text-cyan-800' },
  under_verification: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  finalized: { bg: 'bg-green-100', text: 'text-green-800' },
  on_hold: { bg: 'bg-red-100', text: 'text-red-800' },
}

const priorityColors: Record<string, string> = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800',
  critical: 'bg-red-200 text-red-900',
}

export function RecentCasesTable({ cases }: RecentCasesTableProps) {
  const recentCases = cases.slice(0, 5)

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Recent Cases</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/operations/cases" className="gap-2">
            View all
            <ChevronRight className="w-4 h-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="text-xs font-semibold">Case ID</TableHead>
                <TableHead className="text-xs font-semibold">Property</TableHead>
                <TableHead className="text-xs font-semibold">Bank</TableHead>
                <TableHead className="text-xs font-semibold">Engineer</TableHead>
                <TableHead className="text-xs font-semibold">Status</TableHead>
                <TableHead className="text-xs font-semibold">Priority</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentCases.map((caseItem) => {
                const status = statusColors[caseItem.status] || { bg: 'bg-gray-100', text: 'text-gray-800' }
                return (
                  <TableRow key={caseItem.id} className="border-border hover:bg-muted/50">
                    <TableCell className="text-sm font-medium">
                      <Link href={`/operations/cases/${caseItem.id}`} className="text-primary hover:underline">
                        {caseItem.id}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {caseItem.propertyAddress.split(',')[0]}
                    </TableCell>
                    <TableCell className="text-sm">{caseItem.bank}</TableCell>
                    <TableCell className="text-sm">{caseItem.engineer}</TableCell>
                    <TableCell>
                      <Badge className={`${status.bg} ${status.text} font-medium`}>
                        {caseItem.status.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={priorityColors[caseItem.priority]}>
                        {caseItem.priority}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
