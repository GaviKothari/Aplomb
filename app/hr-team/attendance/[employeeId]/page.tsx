'use client'

import { useParams } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, MapPin, Briefcase, Calendar, User, ArrowLeft } from 'lucide-react'
import { mockEmployees, mockAttendance, mockWorkTimeLogs, mockAttendanceSummary } from '@/lib/mock-data'
import Link from 'next/link'

export default function EmployeeDetailPage() {
  const params = useParams()
  const employeeId = params.employeeId as string
  const employee = mockEmployees.find((e) => e.id === employeeId)
  const employeeAttendance = mockAttendance.filter((a) => a.employeeId === employeeId)
  const employeeSummary = mockAttendanceSummary.find((s) => s.employeeId === employeeId)
  const todayAttendance = employeeAttendance.find((a) => a.date === '2024-03-15')

  if (!employee) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Employee not found</p>
        </div>
      </AppLayout>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300'
      case 'absent':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      case 'leave':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      case 'late':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300'
      default:
        return 'bg-slate-100 text-slate-800'
    }
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Back button */}
        <Button variant="ghost" size="sm" className="gap-2" asChild>
          <Link href="/hr-team/attendance">
            <ArrowLeft className="w-4 h-4" />
            Back to Attendance
          </Link>
        </Button>

        {/* Employee Header */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div>
                  <h1 className="text-3xl font-bold">{employee.name}</h1>
                  <p className="text-muted-foreground mt-1">{employee.designation}</p>
                </div>
                <div className="grid gap-2 grid-cols-2">
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">Employee ID</span>
                    <p className="font-mono text-sm mt-1">{employee.id}</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">Department</span>
                    <p className="font-semibold text-sm mt-1">{employee.department}</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">Email</span>
                    <p className="text-sm mt-1">{employee.email}</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">Phone</span>
                    <p className="text-sm mt-1">{employee.phone}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Today's Status */}
          {todayAttendance && (
            <Card className="border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-950/20">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Today's Status</p>
                    <Badge className={getStatusColor(todayAttendance.status)}>{todayAttendance.status}</Badge>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Punch In</p>
                    <p className="text-lg font-semibold">{todayAttendance.punchIn || '--'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Punch Out</p>
                    <p className="text-lg font-semibold">{todayAttendance.punchOut || '--'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Hours Worked</p>
                    <p className="text-lg font-semibold">{todayAttendance.workHours?.toFixed(1) || '--'}h</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Monthly Summary */}
        {employeeSummary && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Present Days</p>
                    <p className="text-2xl font-bold mt-2 text-emerald-700">{employeeSummary.presentDays}</p>
                  </div>
                  <Calendar className="w-8 h-8 text-emerald-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Leave Days</p>
                    <p className="text-2xl font-bold mt-2 text-blue-700">{employeeSummary.leaveDays}</p>
                  </div>
                  <Briefcase className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Late Days</p>
                    <p className="text-2xl font-bold mt-2 text-amber-700">{employeeSummary.lateDays}</p>
                  </div>
                  <Clock className="w-8 h-8 text-amber-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Total Hrs (Month)</p>
                    <p className="text-2xl font-bold mt-2">{employeeSummary.totalWorkingHours}h</p>
                  </div>
                  <Clock className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Daily Timeline */}
        {todayAttendance && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Today's Timeline
              </CardTitle>
              <CardDescription>Work activities and case history for {todayAttendance.date}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Punch in */}
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-emerald-600 mt-1.5" />
                    <div className="w-1 h-24 bg-slate-200 my-1" />
                  </div>
                  <div className="pt-1">
                    <p className="font-semibold text-sm">Punch In</p>
                    <p className="text-muted-foreground text-xs">{todayAttendance.punchIn}</p>
                    {todayAttendance.latitude && todayAttendance.longitude && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {todayAttendance.latitude.toFixed(4)}, {todayAttendance.longitude.toFixed(4)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Cases worked */}
                {todayAttendance.casesWorked && todayAttendance.casesWorked.length > 0 && (
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full bg-blue-600 mt-1.5" />
                      <div className="w-1 h-16 bg-slate-200 my-1" />
                    </div>
                    <div className="pt-1 flex-1">
                      <p className="font-semibold text-sm">Cases Worked</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {todayAttendance.casesWorked.map((caseId) => (
                          <Badge key={caseId} variant="secondary">
                            {caseId}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Punch out */}
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-red-600 mt-1.5" />
                  </div>
                  <div className="pt-1">
                    <p className="font-semibold text-sm">Punch Out</p>
                    <p className="text-muted-foreground text-xs">{todayAttendance.punchOut}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Work Breakdown */}
        {todayAttendance && (
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Work Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {mockWorkTimeLogs.slice(0, 3).map((log, idx) => (
                  <div key={idx} className="flex items-center justify-between pb-3 border-b last:border-b-0">
                    <div>
                      <p className="text-sm font-medium">{log.caseId}</p>
                      <p className="text-xs text-muted-foreground">{log.startTime} - {log.endTime}</p>
                    </div>
                    <Badge variant="outline">{log.duration.toFixed(1)}h</Badge>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-3 border-t font-semibold">
                  <span>Idle Time</span>
                  <span>{todayAttendance.totalIdleTime || 0}m</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Attendance History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {employeeAttendance.slice(0, 6).map((att) => (
                    <div key={att.id} className="flex items-center justify-between pb-2 border-b last:border-b-0">
                      <div>
                        <p className="text-sm font-medium">{att.date}</p>
                        <Badge variant="outline" className={getStatusColor(att.status)}>
                          {att.status}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {att.punchIn && att.punchOut ? `${att.punchIn} - ${att.punchOut}` : '--'}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
