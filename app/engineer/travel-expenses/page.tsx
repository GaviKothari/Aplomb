'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { useMyTravelExpenses, useSubmitTravelExpense } from '@/lib/api/hooks'
import { Navigation, TrendingUp, Clock, CheckCircle2, Plus, Loader2 } from 'lucide-react'

const STATUS_META: Record<string, { label: string; cls: string }> = {
  PENDING:  { label: 'Pending',  cls: 'bg-amber-100 text-amber-800' },
  APPROVED: { label: 'Approved', cls: 'bg-blue-100 text-blue-800' },
  PAID:     { label: 'Paid',     cls: 'bg-emerald-100 text-emerald-800' },
  REJECTED: { label: 'Rejected', cls: 'bg-red-100 text-red-800' },
}

const today     = new Date().toISOString().split('T')[0]
const thisMonth = today.slice(0, 7)

export default function EngineerTravelPage() {
  const [month, setMonth] = useState(thisMonth)
  const [open, setOpen]   = useState(false)
  const [form, setForm]   = useState({ date: today, distanceKm: '', description: '' })

  const { data, isLoading } = useMyTravelExpenses({ month })
  const submit = useSubmitTravelExpense()

  const expenses: any[] = data?.data ?? []
  const stats           = data?.stats

  const totalKm     = Number(stats?._sum?.distanceKm ?? 0)
  const totalAmount = Number(stats?._sum?.amount ?? 0)
  const pending     = expenses.filter(e => e.status === 'PENDING').length
  const approved    = expenses.filter(e => e.status === 'APPROVED').length

  async function handleSubmit() {
    if (!form.distanceKm || Number(form.distanceKm) <= 0) return
    await submit.mutateAsync({
      date: form.date,
      distanceKm: Number(form.distanceKm),
      description: form.description || undefined,
    })
    setForm({ date: today, distanceKm: '', description: '' })
    setOpen(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 space-y-5">
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Travel & Expenses</h1>
          <p className="text-gray-500 text-sm mt-0.5">Track travel and reimbursements</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="w-4 h-4" />Log Trip
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log Travel Expense</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Distance (km)</Label>
                <Input type="number" min="0" step="0.1" placeholder="e.g. 12.5"
                  value={form.distanceKm}
                  onChange={e => setForm(f => ({ ...f, distanceKm: e.target.value }))} />
                {form.distanceKm && (
                  <p className="text-xs text-gray-500">
                    Reimbursement: ₹{(Number(form.distanceKm) * 8).toFixed(0)} (₹8/km)
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Description (optional)</Label>
                <Textarea placeholder="Route, purpose, case visited…" rows={2}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <Button className="w-full" onClick={handleSubmit} disabled={submit.isPending || !form.distanceKm}>
                {submit.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Submit Expense
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Month picker */}
      <div className="flex items-center gap-3">
        <Label className="text-sm text-gray-600">Month</Label>
        <Input type="month" value={month} onChange={e => setMonth(e.target.value)}
          className="w-40 h-8 text-sm bg-white border-gray-200" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Distance', value: `${totalKm.toFixed(1)} km`, icon: Navigation,   color: 'text-blue-600',    bg: 'bg-blue-50 border-blue-100' },
          { label: 'Earnings', value: `₹${totalAmount.toLocaleString('en-IN')}`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
          { label: 'Pending',  value: pending,  icon: Clock,         color: 'text-amber-600',   bg: 'bg-amber-50 border-amber-100' },
          { label: 'Approved', value: approved, icon: CheckCircle2,  color: 'text-blue-600',    bg: 'bg-blue-50 border-blue-100' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border rounded-xl p-4 flex items-center gap-3`}>
            <div className="w-9 h-9 rounded-lg bg-white/70 flex items-center justify-center shrink-0">
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <div>
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Expense list */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-900">Trips this month</p>
        </div>
        <div className="p-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}
            </div>
          ) : expenses.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">No trips logged this month</p>
          ) : (
            <div className="space-y-2">
              {expenses.map((exp: any) => {
                const meta = STATUS_META[exp.status] ?? { label: exp.status, cls: 'bg-gray-100 text-gray-700' }
                return (
                  <div key={exp.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(exp.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        {exp.description && <span className="text-gray-400 font-normal ml-2">— {exp.description}</span>}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {Number(exp.distanceKm).toFixed(1)} km · ₹{Number(exp.ratePerKm)}/km
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-gray-900">₹{Number(exp.amount).toLocaleString('en-IN')}</span>
                      <Badge className={`text-xs font-normal ${meta.cls}`}>{meta.label}</Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="px-3 py-2.5 rounded-xl bg-blue-50 border border-blue-100 text-xs text-blue-700">
        Reimbursement rate: ₹8/km · Approved expenses are paid with monthly payroll
      </div>
    </div>
  )
}
