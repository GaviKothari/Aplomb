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
import { Skeleton } from '@/components/ui/skeleton'
import { EmployeeFormDialog } from '@/components/employees/employee-form-dialog'
import { useEmployees, useResendWelcome } from '@/lib/api/hooks'
import {
  Plus, Search, Mail, Phone, Eye, Users, UserCheck, UserX, Building2, Send, MailWarning,
} from 'lucide-react'

const DEPARTMENTS = [
  'Field Survey', 'Operations', 'Quality & Verification',
  'Finance & Accounts', 'Human Resources', 'Management', 'IT',
]

const ROLE_META: Record<string, { label: string; cls: string }> = {
  ENGINEER:    { label: 'Engineer',    cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  COORDINATOR: { label: 'Coordinator', cls: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' },
  VERIFIER:    { label: 'Verifier',    cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  ACCOUNTS:    { label: 'Accounts',    cls: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300' },
  HR:          { label: 'HR',          cls: 'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300' },
  ADMIN:       { label: 'Admin',       cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' },
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
  const palette = ['bg-blue-500', 'bg-purple-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500']
  return palette[name.charCodeAt(0) % palette.length]
}

export default function EmployeesPage() {
  const [search, setSearch] = useState('')
  const [dept, setDept] = useState('all')
  const [addOpen, setAddOpen] = useState(false)
  const resendWelcome = useResendWelcome()

  const { data, isLoading } = useEmployees({
    search: search || undefined,
    department: dept !== 'all' ? dept : undefined,
    limit: 100,
  })
  const employees: any[] = data?.data ?? []

  // Summary stats
  const total   = data?.total ?? employees.length
  const active  = employees.filter(e => e.user?.isActive !== false).length
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
              Manage your team members, roles and documents
            </p>
          </div>
          <Button className="gap-2 self-start sm:self-auto" onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4" />
            Add Employee
          </Button>
        </div>

        {/* Summary cards */}
        {!isLoading && employees.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total Team', value: total, icon: Users,      color: 'text-blue-600',    bg: 'bg-blue-50 dark:bg-blue-900/20' },
              { label: 'Active',     value: active,  icon: UserCheck,  color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
              { label: 'Inactive',   value: inactive, icon: UserX,     color: 'text-gray-500',    bg: 'bg-gray-100 dark:bg-gray-800/40' },
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
            <Input
              className="pl-9 h-9"
              placeholder="Search name, email, designation…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
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
                  <Skeleton className="h-5 w-16 rounded-full" />
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
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Designation</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Role</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Contact</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Join Date</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide">Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-20 text-muted-foreground">
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
                    const name     = emp.user?.name ?? emp.employeeCode
                    const email    = emp.user?.email ?? ''
                    const phone    = emp.user?.phone ?? ''
                    const role     = emp.user?.role ?? ''
                    const isActive = emp.user?.isActive ?? true
                    const rm       = ROLE_META[role] ?? { label: role, cls: 'bg-gray-100 text-gray-700' }
                    const deptDot  = DEPT_COLORS[emp.department] ?? 'bg-gray-400'

                    return (
                      <TableRow key={emp.id} className="border-border/40 hover:bg-muted/30 transition-colors">
                        <TableCell className="py-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${avatarColor(name)}`}>
                              {initials(name)}
                            </div>
                            <span className="text-sm font-semibold">{name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{emp.employeeCode}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${deptDot}`} />
                            <span className="text-sm">{emp.department}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{emp.designation}</TableCell>
                        <TableCell>
                          <Badge className={`text-xs font-normal ${rm.cls}`}>{rm.label}</Badge>
                        </TableCell>
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
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {emp.joinDate ? new Date(emp.joinDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge className={isActive
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 text-xs w-fit'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 text-xs w-fit'
                            }>
                              {isActive ? 'Active' : 'Inactive'}
                            </Badge>
                            {!emp.user?.clerkId && (
                              <span className="flex items-center gap-1 text-[10px] text-amber-600 font-medium">
                                <MailWarning className="w-3 h-3" />Invite pending
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" asChild>
                              <Link href={`/hr-team/employees/${emp.id}`}>
                                <Eye className="w-3 h-3" />View
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 gap-1 text-xs text-muted-foreground hover:text-blue-600"
                              disabled={resendWelcome.isPending}
                              onClick={() => resendWelcome.mutate(emp.id)}
                              title={emp.user?.clerkId ? 'Resend welcome notification' : 'Resend Clerk invite'}
                            >
                              <Send className="w-3 h-3" />
                            </Button>
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

      <EmployeeFormDialog open={addOpen} onOpenChange={setAddOpen} />
    </AppLayout>
  )
}
