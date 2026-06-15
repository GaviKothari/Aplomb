'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { EmployeeFormDialog } from '@/components/employees/employee-form-dialog'
import {
  useEmployee, useEmployeeCaseCount, useToggleEmployeeStatus,
} from '@/lib/api/hooks'
import {
  ArrowLeft, Mail, Phone, Calendar, Briefcase,
  Building2, BadgeCheck, Edit, PowerOff, Power,
  IndianRupee, ChevronDown, ChevronUp,
} from 'lucide-react'

const ROLE_META: Record<string, { label: string; cls: string }> = {
  ENGINEER:    { label: 'Field Engineer', cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  COORDINATOR: { label: 'Coordinator',    cls: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' },
  VERIFIER:    { label: 'Verifier',       cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  ACCOUNTS:    { label: 'Accounts',       cls: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300' },
  HR:          { label: 'HR',             cls: 'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300' },
  ADMIN:       { label: 'Admin',          cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' },
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function avatarColor(name: string) {
  const colors = ['bg-blue-500', 'bg-purple-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500']
  return colors[name.charCodeAt(0) % colors.length]
}

function InfoRow({ icon: Icon, label, value, href }: { icon: any; label: string; value?: string | null; href?: string }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border/40 last:border-0">
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        {href ? (
          <a href={href} className="text-sm font-medium text-primary hover:underline break-all">{value}</a>
        ) : (
          <p className="text-sm font-medium">{value}</p>
        )}
      </div>
    </div>
  )
}

const ATTENDANCE_STATUS_STYLE: Record<string, string> = {
  PRESENT:  'bg-emerald-500',
  ABSENT:   'bg-red-400',
  LEAVE:    'bg-amber-400',
  HALF_DAY: 'bg-blue-400',
  HOLIDAY:  'bg-slate-300',
  WEEKEND:  'bg-slate-200',
}

export default function EmployeeDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [editOpen, setEditOpen] = useState(false)
  const [showSalary, setShowSalary] = useState(false)

  const { data: emp, isLoading, error } = useEmployee(id)
  const { data: caseStats } = useEmployeeCaseCount(emp?.user?.id ?? '')
  const toggle = useToggleEmployeeStatus()

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-40 w-full rounded-xl" />
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
          </div>
        </div>
      </AppLayout>
    )
  }

  if (error || !emp) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <Button variant="ghost" size="sm" className="gap-2" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />Back
          </Button>
          <p className="text-muted-foreground py-16 text-center">Employee not found.</p>
        </div>
      </AppLayout>
    )
  }

  const user = emp.user
  const name = user?.name ?? emp.employeeCode
  const isActive = user?.isActive ?? true
  const role = user?.role ?? ''
  const rm = ROLE_META[role] ?? { label: role, cls: 'bg-gray-100 text-gray-700' }

  const totalSalary = [emp.basicSalary, emp.hra, emp.otherAllowances]
    .reduce((s, v) => s + Number(v ?? 0), 0)

  const attendanceRecords: any[] = emp.attendanceRecords ?? []
  const presentCount = attendanceRecords.filter(r => r.status === 'PRESENT').length
  const absentCount = attendanceRecords.filter(r => r.status === 'ABSENT').length
  const leaveCount = attendanceRecords.filter(r => r.status === 'LEAVE').length

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Back */}
        <Button variant="ghost" size="sm" className="gap-2 -ml-2" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
          Back to Employees
        </Button>

        {/* Profile banner */}
        <Card className="border-border/60 overflow-hidden">
          <div className="h-20 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent" />
          <CardContent className="pt-0 pb-5 px-6">
            <div className="flex items-end justify-between -mt-10">
              <div className="flex items-end gap-4">
                <div className={`w-20 h-20 rounded-2xl border-4 border-card flex items-center justify-center text-white text-2xl font-bold shrink-0 ${avatarColor(name)}`}>
                  {initials(name)}
                </div>
                <div className="pb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl font-bold">{name}</h1>
                    <Badge className={`text-xs ${rm.cls}`}>{rm.label}</Badge>
                    <Badge className={isActive
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                    }>
                      {isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-sm mt-0.5">
                    {emp.designation} · {emp.department}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 font-mono">{emp.employeeCode}</p>
                </div>
              </div>
              <div className="flex gap-2 pb-1">
                <Button variant="outline" size="sm" className="gap-2" onClick={() => setEditOpen(true)}>
                  <Edit className="w-3.5 h-3.5" />
                  Edit
                </Button>
                <Button
                  variant={isActive ? 'destructive' : 'outline'}
                  size="sm"
                  className="gap-2"
                  onClick={() => toggle.mutate({ id, active: !isActive })}
                  disabled={toggle.isPending}
                >
                  {isActive ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                  {isActive ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Cases', value: caseStats?.total ?? 0, color: 'text-blue-600' },
            { label: 'Completed', value: caseStats?.completed ?? 0, color: 'text-emerald-600' },
            { label: 'Days Present', value: presentCount, color: 'text-purple-600' },
            { label: 'Leaves Taken', value: leaveCount, color: 'text-amber-600' },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border/60 rounded-xl p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="details">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
          </TabsList>

          {/* Details tab */}
          <TabsContent value="details" className="mt-4">
            <div className="grid gap-4 md:grid-cols-3">
              {/* Contact */}
              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Contact</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <InfoRow icon={Mail} label="Email" value={user?.email} href={`mailto:${user?.email}`} />
                  <InfoRow icon={Phone} label="Phone" value={user?.phone} href={`tel:${user?.phone}`} />
                </CardContent>
              </Card>

              {/* Employment */}
              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Employment</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <InfoRow icon={Building2} label="Department" value={emp.department} />
                  <InfoRow icon={Briefcase} label="Designation" value={emp.designation} />
                  <InfoRow icon={BadgeCheck} label="Type" value={emp.employmentType?.replace('_', ' ')} />
                  <InfoRow
                    icon={Calendar}
                    label="Join Date"
                    value={emp.joinDate ? new Date(emp.joinDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : undefined}
                  />
                  {emp.reportingTo && (
                    <InfoRow icon={Briefcase} label="Reports To" value={emp.reportingTo} />
                  )}
                </CardContent>
              </Card>

              {/* Salary */}
              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">Salary</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs gap-1"
                      onClick={() => setShowSalary(s => !s)}
                    >
                      {showSalary ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      {showSalary ? 'Hide' : 'Show'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {showSalary ? (
                    <>
                      <InfoRow icon={IndianRupee} label="Basic" value={emp.basicSalary ? `₹${Number(emp.basicSalary).toLocaleString('en-IN')}/mo` : undefined} />
                      <InfoRow icon={IndianRupee} label="HRA" value={emp.hra ? `₹${Number(emp.hra).toLocaleString('en-IN')}/mo` : undefined} />
                      <InfoRow icon={IndianRupee} label="Other Allowances" value={emp.otherAllowances ? `₹${Number(emp.otherAllowances).toLocaleString('en-IN')}/mo` : undefined} />
                      {totalSalary > 0 && (
                        <div className="mt-3 pt-3 border-t border-border/40">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">Total CTC/mo</span>
                            <span className="text-base font-bold text-emerald-600">
                              ₹{totalSalary.toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      )}
                      <div className="flex gap-3 mt-3 pt-2 border-t border-border/40">
                        {emp.pfEnabled && <Badge variant="outline" className="text-xs">PF ✓</Badge>}
                        {emp.esiEnabled && <Badge variant="outline" className="text-xs">ESI ✓</Badge>}
                        {!emp.pfEnabled && !emp.esiEnabled && (
                          <p className="text-xs text-muted-foreground">No PF / ESI</p>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      Click Show to view salary details
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Attendance tab */}
          <TabsContent value="attendance" className="mt-4">
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Recent Attendance (Last 60 days)</CardTitle>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    {[
                      { label: 'Present', cls: 'bg-emerald-500' },
                      { label: 'Absent',  cls: 'bg-red-400' },
                      { label: 'Leave',   cls: 'bg-amber-400' },
                    ].map(s => (
                      <span key={s.label} className="flex items-center gap-1">
                        <span className={`w-2.5 h-2.5 rounded-sm ${s.cls}`} />
                        {s.label}
                      </span>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {attendanceRecords.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No attendance records found. Records are created when the engineer uses the punch-in feature.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {/* Summary */}
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Present', value: presentCount, cls: 'text-emerald-600' },
                        { label: 'Absent',  value: absentCount,  cls: 'text-red-500' },
                        { label: 'Leave',   value: leaveCount,   cls: 'text-amber-600' },
                      ].map(s => (
                        <div key={s.label} className="text-center p-3 bg-muted/30 rounded-lg">
                          <p className={`text-xl font-bold ${s.cls}`}>{s.value}</p>
                          <p className="text-xs text-muted-foreground">{s.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Record list */}
                    <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
                      {attendanceRecords.map((r: any) => (
                        <div key={r.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/30 text-sm">
                          <div className="flex items-center gap-3">
                            <span className={`w-2 h-2 rounded-full ${ATTENDANCE_STATUS_STYLE[r.status] ?? 'bg-gray-400'}`} />
                            <span className="text-muted-foreground text-xs">
                              {new Date(r.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            {r.punchIn && (
                              <span className="text-xs text-muted-foreground">
                                In: {new Date(r.punchIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                            {r.punchOut && (
                              <span className="text-xs text-muted-foreground">
                                Out: {new Date(r.punchOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                            {r.workHours && (
                              <span className="text-xs font-medium">{Number(r.workHours).toFixed(1)}h</span>
                            )}
                            <Badge
                              className={`text-xs font-normal ${
                                r.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' :
                                r.status === 'ABSENT'  ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' :
                                r.status === 'LEAVE'   ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' :
                                'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {r.status?.replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <EmployeeFormDialog open={editOpen} onOpenChange={setEditOpen} employee={emp} />
    </AppLayout>
  )
}
