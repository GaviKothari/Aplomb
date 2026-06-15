'use client'

import { AppLayout } from '@/components/layout/app-layout'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { mockPayroll } from '@/lib/mock-data'
import { Download } from 'lucide-react'

export default function PayrollPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Payroll</h1>
            <p className="text-muted-foreground mt-2">Manage employee salaries and payroll</p>
          </div>
          <Button className="gap-2">
            <Download className="w-4 h-4" />
            Download Payroll Sheet
          </Button>
        </div>

        {/* Payroll table */}
        <Card className="border-0 shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-xs font-semibold">Employee</TableHead>
                  <TableHead className="text-xs font-semibold">Base Salary</TableHead>
                  <TableHead className="text-xs font-semibold">Days Worked</TableHead>
                  <TableHead className="text-xs font-semibold">Leaves</TableHead>
                  <TableHead className="text-xs font-semibold">Deductions</TableHead>
                  <TableHead className="text-xs font-semibold">Reimbursements</TableHead>
                  <TableHead className="text-xs font-semibold">Gross Salary</TableHead>
                  <TableHead className="text-xs font-semibold">Net Salary</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockPayroll.map((entry) => (
                  <TableRow key={entry.id} className="border-border hover:bg-muted/50">
                    <TableCell className="text-sm font-medium">
                      {/* Finding employee name from mock data */}
                      {entry.employeeId === 'EMP-001' ? 'Raj Kumar' : 'Priya Singh'}
                    </TableCell>
                    <TableCell className="text-sm">₹{entry.baseSalary.toLocaleString()}</TableCell>
                    <TableCell className="text-sm">{entry.daysWorked}</TableCell>
                    <TableCell className="text-sm">{entry.leaves}</TableCell>
                    <TableCell className="text-sm">₹{entry.deductions.toLocaleString()}</TableCell>
                    <TableCell className="text-sm">₹{entry.reimbursements.toLocaleString()}</TableCell>
                    <TableCell className="text-sm font-semibold">₹{entry.grossSalary.toLocaleString()}</TableCell>
                    <TableCell className="text-sm font-bold">₹{entry.netSalary.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </AppLayout>
  )
}
