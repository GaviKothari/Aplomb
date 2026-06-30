'use client'

import { useState } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useLeaveRequests, useApproveLeave, useRejectLeave } from '@/lib/api/hooks'
import { CalendarDays, CheckCircle2, XCircle, Clock, RotateCcw } from 'lucide-react'

const STATUS_META: Record<string, { label: string; cls: string }> = {
  PENDING:   { label: 'Pending',   cls: 'bg-amber-100 text-amber-800' },
  APPROVED:  { label: 'Approved',  cls: 'bg-emerald-100 text-emerald-800' },
  REJECTED:  { label: 'Rejected',  cls: 'bg-red-100 text-red-800' },
  CANCELLED: { label: 'Cancelled', cls: 'bg-gray-100 text-gray-600' },
}

const LEAVE_LABELS: Record<string, string> = {
  ANNUAL: 'Annual', SICK: 'Sick', CASUAL: 'Casual',
  COMPENSATORY: 'Comp-off', UNPAID: 'Unpaid',
  MATERNITY: 'Maternity', PATERNITY: 'Paternity',
}

export default function LeaveManagementPage() {
  const [status, setStatus] = useState('all')
  const [leaveType, setLeaveType] = useState('all')
  const [rejectTarget, setRejectTarget] = useState<{ id: string; name: string } | null>(null)
  const [rejectNote, setRejectNote] = useState('')
  const [approveTarget, setApproveTarget] = useState<{ id: string; name: string } | null>(null)
  const [approveNote, setApproveNote] = useState('')

  const { data, isLoading } = useLeaveRequests({
    status: status !== 'all' ? status : undefined,
    leaveType: leaveType !== 'all' ? leaveType : undefined,
    limit: 50,
  })
  const approve = useApproveLeave()
  const reject = useRejectLeave()

  const requests: any[] = data?.data ?? []
  const total: number = data?.total ?? 0
  const pending = requests.filter(r => r.status === 'PENDING').length

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Leave Management</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Review and approve employee leave requests
          </p>
        </div>

        {/* Summary chips */}
        {!isLoading && (
          <div className="flex flex-wrap gap-2">
            {[
              { label: `Total · ${total}`, icon: CalendarDays, cls: 'bg-blue-50 text-blue-700 border-blue-200' },
              { label: `Pending · ${pending}`, icon: Clock, cls: 'bg-amber-50 text-amber-700 border-amber-200' },
            ].map(chip => (
              <div key={chip.label}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${chip.cls}`}>
                <chip.icon className="w-3 h-3" />{chip.label}
              </div>
            ))}
          </div>
        )}

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
          <Select value={leaveType} onValueChange={setLeaveType}>
            <SelectTrigger className="w-40 h-9">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {Object.entries(LEAVE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" className="h-9 gap-1.5"
            onClick={() => { setStatus('all'); setLeaveType('all') }}>
            <RotateCcw className="w-3.5 h-3.5" />Reset
          </Button>
        </div>

        {/* Table */}
        <Card className="border-border/60 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="text-xs font-semibold uppercase tracking-wide py-3">Employee</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Type</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">From</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">To</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-center">Days</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Reason</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-16 text-muted-foreground text-sm">
                        No leave requests found
                      </TableCell>
                    </TableRow>
                  ) : requests.map((req: any) => {
                    const meta = STATUS_META[req.status] ?? { label: req.status, cls: 'bg-gray-100 text-gray-700' }
                    const name = req.employee?.user?.name ?? req.employee?.employeeCode ?? '—'
                    const fmt = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                    return (
                      <TableRow key={req.id} className="border-border/40 hover:bg-muted/30">
                        <TableCell className="py-3 text-sm font-medium">{name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {LEAVE_LABELS[req.leaveType] ?? req.leaveType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">{fmt(req.startDate)}</TableCell>
                        <TableCell className="text-sm whitespace-nowrap">{fmt(req.endDate)}</TableCell>
                        <TableCell className="text-sm text-center font-semibold">{req.totalDays}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-48 truncate" title={req.reason}>
                          {req.reason}
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-xs font-normal ${meta.cls}`}>{meta.label}</Badge>
                          {req.approvalNote && (
                            <p className="text-xs text-muted-foreground mt-0.5 max-w-32 truncate" title={req.approvalNote}>
                              {req.approvalNote}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          {req.status === 'PENDING' && (
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost"
                                className="h-7 text-xs text-emerald-700 hover:bg-emerald-50"
                                onClick={() => setApproveTarget({ id: req.id, name })}>
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />Approve
                              </Button>
                              <Button size="sm" variant="ghost"
                                className="h-7 text-xs text-red-600 hover:bg-red-50"
                                onClick={() => setRejectTarget({ id: req.id, name })}>
                                <XCircle className="w-3.5 h-3.5 mr-1" />Reject
                              </Button>
                            </div>
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

      {/* Approve dialog */}
      <Dialog open={!!approveTarget} onOpenChange={o => { if (!o) { setApproveTarget(null); setApproveNote('') } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Leave — {approveTarget?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input placeholder="Note (optional)" value={approveNote}
              onChange={e => setApproveNote(e.target.value)} />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1"
                onClick={() => { setApproveTarget(null); setApproveNote('') }}>
                Cancel
              </Button>
              <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={approve.isPending}
                onClick={async () => {
                  if (!approveTarget) return
                  await approve.mutateAsync({ id: approveTarget.id, note: approveNote || undefined })
                  setApproveTarget(null); setApproveNote('')
                }}>
                Approve
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={o => { if (!o) { setRejectTarget(null); setRejectNote('') } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Leave — {rejectTarget?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Textarea placeholder="Reason for rejection…" rows={2} value={rejectNote}
              onChange={e => setRejectNote(e.target.value)} />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1"
                onClick={() => { setRejectTarget(null); setRejectNote('') }}>
                Cancel
              </Button>
              <Button variant="destructive" className="flex-1"
                disabled={!rejectNote || reject.isPending}
                onClick={async () => {
                  if (!rejectTarget) return
                  await reject.mutateAsync({ id: rejectTarget.id, note: rejectNote })
                  setRejectTarget(null); setRejectNote('')
                }}>
                Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
