'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/app-layout'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { EmployeeFormDialog } from '@/components/employees/employee-form-dialog'
import {
  useEmployees, useResendInvite, useSuspendEmployee, useActivateEmployee,
} from '@/lib/api/hooks'
import {
  Plus, Search, Mail, Phone, Eye, Users, UserCheck, UserX, Building2,
  Send, MailWarning, MailCheck, ShieldOff, ShieldCheck, Clock,
} from 'lucide-react'

const DEPARTMENTS = [
  'Field Survey', 'Operations', 'Quality & Verification',
  'Finance & Accounts', 'Human Resources', 'Management', 'IT',
]

const ROLE_META: Record<string, { label: string; cls: string }> = {
  ENGINEER:      { label: 'Engineer',      cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  COORDINATOR:   { label: 'Coordinator',   cls: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' },
  VERIFIER:      { label: 'Verifier',      cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  REPORT_MAKER:  { label: 'Report Maker',  cls: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300' },
  FINALIZER:     { label: 'Finalizer',     cls: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300' },
  ACCOUNTS:      { label: 'Accounts',      cls: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300' },
  HR:            { label: 'HR',            cls: 'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300' },
  MIS_EXECUTIVE: { label: 'MIS Executive', cls: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300' },
  VIEWER:        { label: 'Viewer',        cls: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  ADMIN:         { label: 'Admin',         cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' },
}

const DEPT_COLORS: Record<string, string> = {
  'Field Survey':           'bg-blue-500',
  'Operations':             'bg-purple-500',
  'Quality & Verification': 'bg-amber-500',
  'Finance & Accounts':     'bg-emerald-500',
  'Human Resources':        'bg-pink-500',
  'Management':             'bg-indigo-500',
  'IT':                     'bg-cyan-500',
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}
function avatarColor(name: string) {
  const p = ['bg-blue-500','bg-purple-500','bg-emerald-500','bg-amber-500','bg-rose-500','bg-cyan-500','bg-indigo-500']
  return p[name.charCodeAt(0) % p.length]
}

/** Derive a single "identity status" from the combination of fields */
function identityStatus(emp: any): {
  label: string; icon: React.ElementType; dot: string; tip: string
} {
  const clerkId        = emp.user?.clerkId
  const inviteStatus   = emp.invitationStatus  // PENDING | SENT | ACCEPTED | FAILED
  const employeeStatus = emp.employeeStatus    // ACTIVE | SUSPENDED | ON_LEAVE | RESIGNED
  const lastLogin      = emp.user?.lastLoginAt
  const isActive       = emp.user?.isActive ?? true

  if (employeeStatus === 'SUSPENDED' || !isActive)
    return { label: 'Suspended',       icon: ShieldOff,   dot: 'bg-red-500',    tip: 'Account suspended — login disabled' }
  if (clerkId && lastLogin)
    return { label: 'Active',          icon: ShieldCheck,  dot: 'bg-emerald-500', tip: `Last login ${new Date(lastLogin).toLocaleDateString('en-IN')}` }
  if (clerkId && !lastLogin)
    return { label: 'Never logged in', icon: Clock,        dot: 'bg-blue-400',   tip: 'Has a Clerk account but has never logged in' }
  if (inviteStatus === 'ACCEPTED')
    return { label: 'Active',          icon: ShieldCheck,  dot: 'bg-emerald-500', tip: 'Invitation accepted' }
  if (inviteStatus === 'SENT')
    return { label: 'Invite Pending',  icon: MailWarning,  dot: 'bg-amber-500',  tip: 'Invitation email sent — awaiting acceptance' }
  if (inviteStatus === 'FAILED')
    return { label: 'Invite Failed',   icon: MailWarning,  dot: 'bg-red-400',    tip: 'Invitation could not be sent — click resend' }
  return   { label: 'Not Invited',     icon: MailWarning,  dot: 'bg-gray-400',   tip: 'No invitation sent yet' }
}

export default function EmployeesPage() {
  const [search, setSearch] = useState('')
  const [dept,   setDept]   = useState('all')
  const [addOpen, setAddOpen] = useState(false)
  const [confirmSuspend, setConfirmSuspend] = useState<{ id: string; name: string } | null>(null)

  const resendInvite = useResendInvite()
  const suspend      = useSuspendEmployee()
  const activate     = useActivateEmployee()

  const { data, isLoading } = useEmployees({
    search:     search || undefined,
    department: dept !== 'all' ? dept : undefined,
    limit:      100,
  })
  const employees: any[] = data?.data ?? []

  const total    = data?.total ?? employees.length
  const active   = employees.filter(e => e.user?.isActive !== false).length
  const inactive = employees.filter(e => e.user?.isActive === false).length
  const deptCounts: Record<string, number> = {}
  employees.forEach(e => { if (e.department) deptCounts[e.department] = (deptCounts[e.department] ?? 0) + 1 })
  const topDept = Object.entries(deptCounts).sort((a, b) => b[1] - a[1])[0]

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Employees</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Manage your team, roles, and Clerk access
            </p>
          </div>
          <Button className="gap-2 self-start sm:self-auto" onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4" />Add Employee
          </Button>
        </div>

        {/* Summary cards */}
        {!isLoading && employees.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total Team', value: total,    icon: Users,      color: 'text-blue-600',    bg: 'bg-blue-50 dark:bg-blue-900/20' },
              { label: 'Active',     value: active,   icon: UserCheck,  color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
              { label: 'Inactive',   value: inactive, icon: UserX,      color: 'text-gray-500',    bg: 'bg-gray-100 dark:bg-gray-800/40' },
              { label: topDept?.[0] ?? 'Department', value: topDept?.[1] ?? 0, icon: Building2, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
            ].map(s => (
              <div key={s.label} className={`${s.bg} rounded-xl p-4 flex items-center gap-3 border border-transparent`}>
                <div className="w-9 h-9 rounded-lg bg-white/60 dark:bg-black/20 flex items-center justify-center shrink-0">
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <div>
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-muted-foreground leading-tight">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9 h-9" placeholder="Search name, email, designation…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={dept} onValueChange={setDept}>
            <SelectTrigger className="w-52 h-9">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {DEPARTMENTS.map(d => (
                <SelectItem key={d} value={d}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${DEPT_COLORS[d] ?? 'bg-gray-400'}`} />
                    {d}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card className="border-border/60 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="w-9 h-9 rounded-full" />
                  <Skeleton className="h-4 flex-1 max-w-48" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/60 bg-muted/30 hover:bg-muted/30">
                    <TableHead className="text-xs font-semibold uppercase tracking-wide py-3">Employee</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Code</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Department</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Role</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Contact</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Status</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Last Login</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-20 text-muted-foreground">
                        <div className="space-y-2">
                          <Users className="w-10 h-10 mx-auto text-muted-foreground/40" />
                          <p className="text-sm">
                            {search || dept !== 'all' ? 'No employees match your filters.' : 'No employees yet.'}
                          </p>
                          {!search && dept === 'all' && (
                            <Button size="sm" className="gap-1.5" onClick={() => setAddOpen(true)}>
                              <Plus className="w-3.5 h-3.5" />Add first employee
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : employees.map((emp: any) => {
                    const name     = emp.user?.name  ?? emp.employeeCode
                    const email    = emp.user?.email ?? ''
                    const phone    = emp.user?.phone ?? ''
                    const role     = emp.user?.role  ?? ''
                    const isActive = emp.user?.isActive ?? true
                    const rm       = ROLE_META[role] ?? { label: role, cls: 'bg-gray-100 text-gray-700' }
                    const deptDot  = DEPT_COLORS[emp.department] ?? 'bg-gray-400'
                    const status   = identityStatus(emp)
                    const noClerk  = !emp.user?.clerkId && emp.invitationStatus !== 'ACCEPTED'

                    return (
                      <TableRow key={emp.id} className="border-border/40 hover:bg-muted/30 transition-colors">
                        {/* Employee */}
                        <TableCell className="py-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${avatarColor(name)}`}>
                              {initials(name)}
                            </div>
                            <div>
                              <p className="text-sm font-semibold">{name}</p>
                              <p className="text-xs text-muted-foreground">{emp.designation}</p>
                            </div>
                          </div>
                        </TableCell>

                        {/* Code */}
                        <TableCell className="font-mono text-xs text-muted-foreground">{emp.employeeCode}</TableCell>

                        {/* Department */}
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${deptDot}`} />
                            <span className="text-sm">{emp.department}</span>
                          </div>
                        </TableCell>

                        {/* Role */}
                        <TableCell>
                          <Badge className={`text-xs font-normal ${rm.cls}`}>{rm.label}</Badge>
                        </TableCell>

                        {/* Contact */}
                        <TableCell>
                          <div className="space-y-0.5 text-xs">
                            {email && (
                              <a href={`mailto:${email}`} className="flex items-center gap-1 text-primary hover:underline">
                                <Mail className="w-3 h-3 shrink-0" />
                                <span className="truncate max-w-36">{email}</span>
                              </a>
                            )}
                            {phone && (
                              <a href={`tel:${phone}`} className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
                                <Phone className="w-3 h-3 shrink-0" />{phone}
                              </a>
                            )}
                          </div>
                        </TableCell>

                        {/* Identity status */}
                        <TableCell>
                          <div className="flex items-center gap-1.5" title={status.tip}>
                            <span className={`w-2 h-2 rounded-full shrink-0 ${status.dot}`} />
                            <span className="text-xs font-medium">{status.label}</span>
                          </div>
                        </TableCell>

                        {/* Last login */}
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {emp.user?.lastLoginAt
                            ? new Date(emp.user.lastLoginAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                            : <span className="text-muted-foreground/50">—</span>}
                        </TableCell>

                        {/* Actions */}
                        <TableCell>
                          <div className="flex items-center gap-0.5">
                            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" asChild>
                              <Link href={`/hr-team/employees/${emp.id}`}>
                                <Eye className="w-3 h-3" />View
                              </Link>
                            </Button>

                            {/* Resend invite — only if no Clerk account yet */}
                            {noClerk && (
                              <Button
                                variant="ghost" size="sm"
                                className="h-7 w-7 p-0 text-amber-600 hover:bg-amber-50"
                                disabled={resendInvite.isPending}
                                onClick={() => resendInvite.mutate(emp.id)}
                                title="Resend Clerk invitation email"
                              >
                                <Send className="w-3.5 h-3.5" />
                              </Button>
                            )}

                            {/* Account accepted — show mail check indicator */}
                            {!noClerk && emp.user?.clerkId && (
                              <span className="w-7 h-7 flex items-center justify-center text-emerald-500" title="Clerk account active">
                                <MailCheck className="w-3.5 h-3.5" />
                              </span>
                            )}

                            {/* Suspend / Activate */}
                            {isActive ? (
                              <Button
                                variant="ghost" size="sm"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                                disabled={suspend.isPending}
                                onClick={() => setConfirmSuspend({ id: emp.id, name })}
                                title="Suspend employee"
                              >
                                <ShieldOff className="w-3.5 h-3.5" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost" size="sm"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50"
                                disabled={activate.isPending}
                                onClick={() => activate.mutate(emp.id)}
                                title="Re-activate employee"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
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

      {/* Suspend confirmation dialog */}
      <Dialog open={!!confirmSuspend} onOpenChange={o => { if (!o) setConfirmSuspend(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Suspend {confirmSuspend?.name}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will immediately ban their Clerk account and prevent login. You can re-activate them at any time.
          </p>
          <div className="flex gap-2 mt-2">
            <Button variant="outline" className="flex-1" onClick={() => setConfirmSuspend(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive" className="flex-1"
              disabled={suspend.isPending}
              onClick={async () => {
                if (!confirmSuspend) return
                await suspend.mutateAsync(confirmSuspend.id)
                setConfirmSuspend(null)
              }}
            >
              Suspend
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <EmployeeFormDialog open={addOpen} onOpenChange={setAddOpen} />
    </AppLayout>
  )
}
