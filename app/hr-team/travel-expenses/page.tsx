'use client'

import { useState } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { useTravelExpenses, useApproveTravelExpense, useRejectTravelExpense } from '@/lib/api/hooks'
import {
  Navigation, DollarSign, Clock, CheckCircle2, XCircle, RotateCcw,
} from 'lucide-react'

const STATUS_META: Record<string, { label: string; cls: string }> = {
  PENDING:  { label: 'Pending',  cls: 'bg-amber-100 text-amber-800' },
  APPROVED: { label: 'Approved', cls: 'bg-blue-100 text-blue-800' },
  PAID:     { label: 'Paid',     cls: 'bg-emerald-100 text-emerald-800' },
  REJECTED: { label: 'Rejected', cls: 'bg-red-100 text-red-800' },
}

export default function HRTravelExpensesPage() {
  const [status, setStatus] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [rejectTarget, setRejectTarget] = useState<{ id: string; name: string } | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const { data, isLoading } = useTravelExpenses({
    status: status !== 'all' ? status : undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    limit: 50,
  })

  const approve = useApproveTravelExpense()
  const reject = useRejectTravelExpense()

  const expenses: any[] = data?.data ?? []
  const stats = data?.stats

  const totalKm     = Number(stats?._sum?.distanceKm ?? 0)
  const totalAmount = Number(stats?._sum?.amount ?? 0)
  const pending     = expenses.filter(e => e.status === 'PENDING').length
  const pendingAmt  = expenses.filter(e => e.status === 'PENDING').reduce((s: number, e: any) => s + Number(e.amount), 0)

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Travel & Expenses</h1>
            <p className="text-muted-foreground mt-1 text-sm">Review and approve engineer travel reimbursements</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Distance', value: `${totalKm.toFixed(1)} km`, icon: Navigation, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
            { label: 'Total Amount',   value: `₹${totalAmount.toLocaleString('en-IN')}`, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
            { label: 'Pending',        value: `${pending} (₹${pendingAmt.toLocaleString('en-IN')})`, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
            { label: 'Rate',           value: '₹8/km', icon: CheckCircle2, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-xl p-4 flex items-center gap-3 border border-transparent`}>
              <div className="w-9 h-9 rounded-lg bg-white/60 dark:bg-black/20 flex items-center justify-center shrink-0">
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <div>
                <p className={`text-base font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-36 h-9">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {Object.entries(STATUS_META).map(([k, m]) => (
                <SelectItem key={k} value={k}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="w-40 h-9 text-sm" placeholder="From" />
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="w-40 h-9 text-sm" placeholder="To" />
          <Button variant="ghost" size="sm" className="h-9 gap-1.5"
            onClick={() => { setStatus('all'); setDateFrom(''); setDateTo('') }}>
            <RotateCcw className="w-3.5 h-3.5" />Reset
          </Button>
        </div>

        {/* Table */}
        <Card className="border-border/60 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="text-xs font-semibold uppercase tracking-wide py-3">Engineer</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Date</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Description</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-right">Distance</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-right">Amount</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-16 text-muted-foreground text-sm">
                        No expenses match your filters
                      </TableCell>
                    </TableRow>
                  ) : expenses.map((exp: any) => {
                    const meta = STATUS_META[exp.status] ?? { label: exp.status, cls: 'bg-gray-100 text-gray-700' }
                    const name = exp.employee?.user?.name ?? exp.employee?.employeeCode ?? '—'
                    return (
                      <TableRow key={exp.id} className="border-border/40 hover:bg-muted/30">
                        <TableCell className="py-3 text-sm font-medium">{name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {new Date(exp.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                          {exp.description ?? '—'}
                        </TableCell>
                        <TableCell className="text-sm text-right tabular-nums">
                          {Number(exp.distanceKm).toFixed(1)} km
                        </TableCell>
                        <TableCell className="text-sm font-semibold text-right tabular-nums">
                          ₹{Number(exp.amount).toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-xs font-normal ${meta.cls}`}>{meta.label}</Badge>
                        </TableCell>
                        <TableCell>
                          {exp.status === 'PENDING' && (
                            <div className="flex gap-1">
                              <Button
                                size="sm" variant="ghost"
                                className="h-7 text-xs text-emerald-700 hover:bg-emerald-50"
                                disabled={approve.isPending}
                                onClick={() => approve.mutate(exp.id)}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />Approve
                              </Button>
                              <Button
                                size="sm" variant="ghost"
                                className="h-7 text-xs text-red-600 hover:bg-red-50"
                                onClick={() => setRejectTarget({ id: exp.id, name })}
                              >
                                <XCircle className="w-3.5 h-3.5 mr-1" />Reject
                              </Button>
                            </div>
                          )}
                          {exp.approvalNote && exp.status === 'REJECTED' && (
                            <p className="text-xs text-muted-foreground max-w-32 truncate" title={exp.approvalNote}>
                              {exp.approvalNote}
                            </p>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>

      {/* Reject dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={o => { if (!o) { setRejectTarget(null); setRejectReason('') } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Expense — {rejectTarget?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              placeholder="Reason for rejection…"
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setRejectTarget(null); setRejectReason('') }}>
                Cancel
              </Button>
              <Button
                variant="destructive" className="flex-1"
                disabled={!rejectReason || reject.isPending}
                onClick={async () => {
                  if (!rejectTarget) return
                  await reject.mutateAsync({ id: rejectTarget.id, reason: rejectReason })
                  setRejectTarget(null)
                  setRejectReason('')
                }}
              >
                Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
