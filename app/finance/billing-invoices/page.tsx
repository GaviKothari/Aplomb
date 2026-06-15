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
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TablePageSkeleton } from '@/components/ui/page-skeleton'
import { useInvoices } from '@/lib/api/hooks'
import { Download } from 'lucide-react'

const statusColor: Record<string, string> = {
  PAID: 'bg-green-100 text-green-800',
  SENT: 'bg-blue-100 text-blue-800',
  DRAFT: 'bg-gray-100 text-gray-800',
  OVERDUE: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-slate-100 text-slate-600',
}

export default function BillingPage() {
  const { data, isLoading } = useInvoices()
  const invoices = data?.data ?? []

  if (isLoading) {
    return (
      <AppLayout>
        <TablePageSkeleton rows={8} cols={6} />
      </AppLayout>
    )
  }

  const totalRevenue = invoices
    .filter((inv: any) => inv.status === 'PAID')
    .reduce((sum: number, inv: any) => sum + (inv.totalAmount ?? 0), 0)

  const pendingRevenue = invoices
    .filter((inv: any) => ['SENT', 'OVERDUE'].includes(inv.status))
    .reduce((sum: number, inv: any) => sum + (inv.totalAmount ?? 0), 0)

  const thisMonth = new Date().toISOString().slice(0, 7)
  const thisMonthRevenue = invoices
    .filter((inv: any) => inv.issuedAt?.startsWith(thisMonth))
    .reduce((sum: number, inv: any) => sum + (inv.totalAmount ?? 0), 0)

  const fmt = (n: number) =>
    n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : `₹${(n / 1000).toFixed(0)}K`

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing & Invoices</h1>
          <p className="text-muted-foreground mt-2">Manage invoices and billing information</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{fmt(totalRevenue)}</div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{fmt(pendingRevenue)}</div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{fmt(thisMonthRevenue)}</div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-0 shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-xs font-semibold">Invoice #</TableHead>
                  <TableHead className="text-xs font-semibold">Bank</TableHead>
                  <TableHead className="text-xs font-semibold">Amount</TableHead>
                  <TableHead className="text-xs font-semibold">Issued</TableHead>
                  <TableHead className="text-xs font-semibold">Due Date</TableHead>
                  <TableHead className="text-xs font-semibold">Status</TableHead>
                  <TableHead className="text-xs font-semibold">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                      No invoices yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices.map((invoice: any) => (
                    <TableRow key={invoice.id} className="border-border hover:bg-muted/50">
                      <TableCell className="text-sm font-medium">{invoice.invoiceNumber}</TableCell>
                      <TableCell className="text-sm">{invoice.organization?.name ?? '—'}</TableCell>
                      <TableCell className="text-sm font-semibold">{fmt(invoice.totalAmount ?? 0)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {invoice.issuedAt ? new Date(invoice.issuedAt).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColor[invoice.status] ?? 'bg-gray-100 text-gray-800'}>
                          {invoice.status?.toLowerCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="gap-2">
                          <Download className="w-4 h-4" />
                          Download
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </AppLayout>
  )
}
