'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, TrendingUp, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import { StatCard } from '@/components/dashboard/stat-card'
import { mockInvoices } from '@/lib/mock-data'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export function AccountsDashboard() {
  const totalInvoices = mockInvoices.length
  const paidAmount = mockInvoices
    .filter((i) => i.status === 'paid')
    .reduce((sum, i) => sum + i.amount, 0)
  const outstandingAmount = mockInvoices
    .filter((i) => i.status === 'pending' || i.status === 'overdue')
    .reduce((sum, i) => sum + i.amount, 0)
  const collectionRate = Math.round((paidAmount / (paidAmount + outstandingAmount)) * 100)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing & Finance</h1>
        <p className="text-muted-foreground mt-2">Invoice management and payment tracking</p>
      </div>

      {/* Primary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Total Invoices"
          value={totalInvoices}
          icon={DollarSign}
          color="bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300"
          trend={5}
        />
        <StatCard
          label="Amount Received"
          value={`₹${(paidAmount / 100000).toFixed(1)}L`}
          icon={TrendingUp}
          color="bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300"
          trend={8}
        />
        <StatCard
          label="Outstanding"
          value={`₹${(outstandingAmount / 100000).toFixed(1)}L`}
          icon={AlertCircle}
          color="bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300"
          trend={-3}
        />
      </div>

      {/* Collection Rate & Financial Overview */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Collection Rate</span>
              <span className="text-2xl font-bold text-emerald-600">{collectionRate}%</span>
            </CardTitle>
            <CardDescription>Payment tracking efficiency</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-500"
                  style={{ width: `${collectionRate}%` }}
                />
              </div>
              <div className="grid gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Paid</span>
                  <span className="font-semibold">₹{(paidAmount / 100000).toFixed(1)}L</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Outstanding</span>
                  <span className="font-semibold text-amber-600">₹{(outstandingAmount / 100000).toFixed(1)}L</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/50">
          <CardHeader>
            <CardTitle>Financial Summary</CardTitle>
            <CardDescription>This month's metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20">
                <p className="text-xs text-muted-foreground">Total Revenue</p>
                <p className="text-xl font-bold text-emerald-700 mt-1">₹{((paidAmount + outstandingAmount) / 100000).toFixed(1)}L</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                <p className="text-xs text-muted-foreground">Avg Invoice Value</p>
                <p className="text-xl font-bold text-blue-700 mt-1">₹{((paidAmount + outstandingAmount) / totalInvoices / 100000).toFixed(2)}L</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Management */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Invoices</CardTitle>
          <CardDescription>Latest billing activity and payment status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockInvoices.slice(0, 8).map((invoice, idx) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 hover:border-primary/30 transition-all group stagger-item animate-in fade-in slide-in-from-left-4"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="flex-1">
                  <p className="text-sm font-semibold group-hover:text-primary transition-colors">{invoice.invoiceNumber}</p>
                  <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                    <span>{invoice.bank}</span>
                    <span className="text-muted-foreground/60">•</span>
                    <span>{invoice.dueDate}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-semibold">₹{(invoice.amount / 100000).toFixed(2)}L</p>
                    <Badge
                      className={
                        invoice.status === 'paid'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300 mt-1'
                          : invoice.status === 'overdue'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 mt-1'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300 mt-1'
                      }
                    >
                      {invoice.status}
                    </Badge>
                  </div>
                  {invoice.status === 'pending' && (
                    <Button size="sm" variant="outline" className="gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Send Reminder
                    </Button>
                  )}
                  {invoice.status === 'overdue' && (
                    <Button size="sm" variant="outline" className="gap-1 text-red-600">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Follow Up
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
