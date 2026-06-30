'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useMyLeave, useLeaveBalance, useApplyLeave, useCancelLeave } from '@/lib/api/hooks'
import { CalendarDays, Plus, Loader2, X } from 'lucide-react'

const STATUS_META: Record<string, { label: string; cls: string }> = {
  PENDING:   { label: 'Pending',   cls: 'bg-amber-100 text-amber-800' },
  APPROVED:  { label: 'Approved',  cls: 'bg-emerald-100 text-emerald-800' },
  REJECTED:  { label: 'Rejected',  cls: 'bg-red-100 text-red-800' },
  CANCELLED: { label: 'Cancelled', cls: 'bg-gray-100 text-gray-600' },
}

const LEAVE_TYPES = [
  { value: 'ANNUAL',       label: 'Annual Leave' },
  { value: 'SICK',         label: 'Sick Leave' },
  { value: 'CASUAL',       label: 'Casual Leave' },
  { value: 'COMPENSATORY', label: 'Compensatory Off' },
  { value: 'UNPAID',       label: 'Unpaid Leave' },
]

const today = new Date().toISOString().split('T')[0]

export default function EngineerLeavePage() {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ leaveType: '', startDate: today, endDate: today, reason: '' })

  const { data: myData, isLoading: myLoading } = useMyLeave()
  const { data: balance, isLoading: balLoading } = useLeaveBalance()
  const apply  = useApplyLeave()
  const cancel = useCancelLeave()

  const requests: any[]    = myData?.requests ?? []
  const balanceList: any[] = Array.isArray(balance) ? balance : []

  const days = form.startDate && form.endDate
    ? Math.max(0, Math.ceil((new Date(form.endDate).getTime() - new Date(form.startDate).getTime()) / 86400000) + 1)
    : 0

  async function handleApply() {
    if (!form.leaveType || !form.startDate || !form.endDate || !form.reason) return
    await apply.mutateAsync({ ...form })
    setForm({ leaveType: '', startDate: today, endDate: today, reason: '' })
    setOpen(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 space-y-5">
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Leave</h1>
          <p className="text-gray-500 text-sm mt-0.5">Apply for leave and track requests</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="w-4 h-4" />Apply
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Apply for Leave</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label>Leave Type</Label>
                <Select value={form.leaveType} onValueChange={v => setForm(f => ({ ...f, leaveType: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {LEAVE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>From</Label>
                  <Input type="date" value={form.startDate}
                    onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>To</Label>
                  <Input type="date" value={form.endDate}
                    onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
                </div>
              </div>
              {days > 0 && (
                <p className="text-xs text-gray-500">{days} day{days !== 1 ? 's' : ''}</p>
              )}
              <div className="space-y-1.5">
                <Label>Reason</Label>
                <Textarea placeholder="Brief reason for leave…" rows={2} value={form.reason}
                  onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
              </div>
              <Button className="w-full" onClick={handleApply}
                disabled={apply.isPending || !form.leaveType || !form.reason || days < 1}>
                {apply.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Submit Application
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Leave balance */}
      {balLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : balanceList.length > 0 ? (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Balance {new Date().getFullYear()}</p>
          <div className="grid grid-cols-2 gap-3">
            {balanceList.map((b: any) => (
              <div key={b.id} className="rounded-xl border border-gray-200 bg-white shadow-sm p-3 space-y-1">
                <p className="text-xs text-gray-500">{LEAVE_TYPES.find(t => t.value === b.leaveType)?.label ?? b.leaveType}</p>
                <div className="flex items-end gap-1.5">
                  <span className="text-xl font-bold text-gray-900">{b.remainingDays}</span>
                  <span className="text-xs text-gray-400 mb-0.5">/ {b.totalDays} left</span>
                </div>
                {b.pendingDays > 0 && (
                  <p className="text-xs text-amber-600">{b.pendingDays} pending</p>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Request history */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-gray-400" />
          <p className="text-sm font-semibold text-gray-900">Leave Requests</p>
        </div>
        <div className="p-4">
          {myLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}
            </div>
          ) : requests.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">No leave requests yet</p>
          ) : (
            <div className="space-y-2">
              {requests.map((req: any) => {
                const meta       = STATUS_META[req.status] ?? { label: req.status, cls: 'bg-gray-100 text-gray-600' }
                const leaveLabel = LEAVE_TYPES.find(t => t.value === req.leaveType)?.label ?? req.leaveType
                const fmt        = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                return (
                  <div key={req.id} className="flex items-start justify-between p-3 rounded-xl border border-gray-100 bg-gray-50">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{leaveLabel}</span>
                        <Badge className={`text-xs font-normal ${meta.cls}`}>{meta.label}</Badge>
                      </div>
                      <p className="text-xs text-gray-500">
                        {fmt(req.startDate)} – {fmt(req.endDate)} · {req.totalDays} day{req.totalDays !== 1 ? 's' : ''}
                      </p>
                      {req.reason && <p className="text-xs text-gray-500 truncate max-w-48">{req.reason}</p>}
                      {req.approvalNote && (
                        <p className="text-xs text-gray-400 italic">{req.approvalNote}</p>
                      )}
                    </div>
                    {req.status === 'PENDING' && (
                      <button
                        disabled={cancel.isPending}
                        onClick={() => cancel.mutate(req.id)}
                        className="h-7 w-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-200 active:bg-gray-300"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
