'use client'

import { useState } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Users, CheckCircle2, XCircle, Clock, Calendar } from 'lucide-react'
import { useAttendanceList, useEmployees } from '@/lib/api/hooks'
import Link from 'next/link'

function formatTime(isoOrTime?: string | null) {
  if (!isoOrTime) return '—'
  // Handle both ISO timestamp and HH:mm string
  if (isoOrTime.includes('T')) {
    return new Date(isoOrTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  return isoOrTime
}

function calcHours(punchIn?: string | null, punchOut?: string | null) {
  if (!punchIn) return '—'
  const start = new Date(punchIn).getTime()
  const end = punchOut ? new Date(punchOut).getTime() : Date.now()
  return ((end - start) / 3_600_000).toFixed(1) + 'h'
}

const statusColor: Record<string, string> = {
  PRESENT: 'bg-emerald-100 text-emerald-800',
  ABSENT: 'bg-red-100 text-red-800',
  LEAVE: 'bg-blue-100 text-blue-800',
  LATE: 'bg-amber-100 text-amber-800',
}

export default function AttendancePage() {
  const today = new Date().toISOString().split('T')[0]
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDate, setFilterDate] = useState(today)
  const [filterStatus, setFilterStatus] = useState('all')

  const { data: attendanceData, isLoading: loadingAtt } = useAttendanceList({ date: filterDate })
  const { data: employeeData, isLoading: loadingEmp } = useEmployees()

  const records: any[] = attendanceData?.data ?? []
  const employees: any[] = employeeData?.data ?? []
  const totalEmployees = employeeData?.total ?? employees.length

  const filtered = records.filter((r: any) => {
    const emp = employees.find((e: any) => e.id === r.employeeId || e.userId === r.userId)
    const name = emp?.user
      ? `${emp.user.firstName ?? ''} ${emp.user.lastName ?? ''}`.trim()
      : ''
    const matchSearch = !searchTerm || name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchStatus = filterStatus === 'all' || r.status === filterStatus.toUpperCase()
    return matchSearch && matchStatus
  })

  const count = (status: string) => records.filter((r: any) => r.status === status).length
  const isLoading = loadingAtt || loadingEmp

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Attendance Management</h1>
          <p className="text-muted-foreground mt-2">Track employee attendance and work hours</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {[
            { label: 'Total Employees', value: totalEmployees, icon: Users, color: 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/20', iconColor: 'text-blue-600' },
            { label: 'Present', value: count('PRESENT'), icon: CheckCircle2, color: 'border-l-emerald-500 bg-emerald-50 dark:bg-emerald-950/20', iconColor: 'text-emerald-600' },
            { label: 'Absent', value: count('ABSENT'), icon: XCircle, color: 'border-l-red-500 bg-red-50 dark:bg-red-950/20', iconColor: 'text-red-600' },
            { label: 'On Leave', value: count('LEAVE'), icon: Calendar, color: 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/20', iconColor: 'text-blue-600' },
            { label: 'Late', value: count('LATE'), icon: Clock, color: 'border-l-amber-500 bg-amber-50 dark:bg-amber-950/20', iconColor: 'text-amber-600' },
          ].map(({ label, value, icon: Icon, color, iconColor }) => (
            <Card key={label} className={`border-l-4 ${color}`}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{label}</p>
                    <p className="text-2xl font-bold mt-2">{isLoading ? '…' : value}</p>
                  </div>
                  <Icon className={`w-8 h-8 ${iconColor}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-64">
            <Input
              placeholder="Search employee by name…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
          />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="present">Present</SelectItem>
              <SelectItem value="absent">Absent</SelectItem>
              <SelectItem value="leave">Leave</SelectItem>
              <SelectItem value="late">Late</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Daily Attendance</CardTitle>
            <CardDescription>Showing records for {filterDate}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold">Employee</th>
                    <th className="text-left py-3 px-4 font-semibold">Designation</th>
                    <th className="text-center py-3 px-4 font-semibold">Punch In</th>
                    <th className="text-center py-3 px-4 font-semibold">Punch Out</th>
                    <th className="text-center py-3 px-4 font-semibold">Hours</th>
                    <th className="text-center py-3 px-4 font-semibold">Status</th>
                    <th className="text-center py-3 px-4 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 7 }).map((_, j) => (
                          <td key={j} className="py-3 px-4">
                            <Skeleton className="h-4 w-20" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-muted-foreground">
                        No attendance records for this date.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((r: any) => {
                      const emp = employees.find((e: any) => e.id === r.employeeId || e.userId === r.userId)
                      const name = emp?.user
                        ? `${emp.user.firstName ?? ''} ${emp.user.lastName ?? ''}`.trim() || emp.user.email
                        : '—'
                      return (
                        <tr key={r.id} className="border-b hover:bg-muted/50 transition-colors">
                          <td className="py-3 px-4 font-medium">{name}</td>
                          <td className="py-3 px-4 text-muted-foreground text-xs">{emp?.designation ?? '—'}</td>
                          <td className="py-3 px-4 text-center">{formatTime(r.punchIn)}</td>
                          <td className="py-3 px-4 text-center">{formatTime(r.punchOut)}</td>
                          <td className="py-3 px-4 text-center font-semibold">{calcHours(r.punchIn, r.punchOut)}</td>
                          <td className="py-3 px-4 text-center">
                            <Badge className={statusColor[r.status] ?? 'bg-slate-100 text-slate-800'}>
                              {r.status?.toLowerCase()}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/hr-team/attendance/${emp?.id ?? r.employeeId}`}>View</Link>
                            </Button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Attendance rate */}
        {!isLoading && records.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Attendance Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">Today ({filterDate})</span>
                <span className="text-2xl font-bold">
                  {totalEmployees > 0 ? Math.round((count('PRESENT') / totalEmployees) * 100) : 0}%
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className="bg-emerald-600 h-2 rounded-full"
                  style={{ width: `${totalEmployees > 0 ? (count('PRESENT') / totalEmployees) * 100 : 0}%` }}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  )
}
