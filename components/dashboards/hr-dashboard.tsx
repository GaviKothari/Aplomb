'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, UserCheck, Users2, TrendingUp, Calendar } from 'lucide-react'
import { StatCard } from '@/components/dashboard/stat-card'
import { mockEmployees } from '@/lib/mock-data'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export function HRDashboard() {
  const activeEmployees = mockEmployees.filter((e) => e.status === 'active').length
  const presentToday = Math.floor(activeEmployees * 0.92)
  const onLeave = activeEmployees - presentToday
  const attendanceRate = Math.round((presentToday / activeEmployees) * 100)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">HR Dashboard</h1>
        <p className="text-muted-foreground mt-2">Employee management and attendance tracking</p>
      </div>

      {/* Primary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Total Employees"
          value={activeEmployees}
          icon={Users}
          color="bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300"
          trend={2}
        />
        <StatCard
          label="Present Today"
          value={presentToday}
          icon={UserCheck}
          color="bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300"
          trend={3}
        />
        <StatCard
          label="On Leave"
          value={onLeave}
          icon={Users2}
          color="bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300"
        />
      </div>

      {/* Attendance Overview */}
      <Card className="border border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Today's Attendance</span>
            <span className="text-2xl font-bold text-emerald-600">{attendanceRate}%</span>
          </CardTitle>
          <CardDescription>Real-time attendance tracking</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-500"
                style={{ width: `${attendanceRate}%` }}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3 text-center">
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20">
                <p className="text-2xl font-bold text-emerald-700">{presentToday}</p>
                <p className="text-xs text-muted-foreground">Present</p>
              </div>
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20">
                <p className="text-2xl font-bold text-amber-700">{onLeave}</p>
                <p className="text-xs text-muted-foreground">On Leave</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                <p className="text-2xl font-bold text-blue-700">0</p>
                <p className="text-xs text-muted-foreground">Absent</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employee Directory */}
      <Card>
        <CardHeader>
          <CardTitle>Employee Directory</CardTitle>
          <CardDescription>Active staff members and their details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockEmployees.slice(0, 8).map((emp, idx) => (
              <div
                key={emp.id}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 hover:border-primary/30 transition-all group stagger-item animate-in fade-in slide-in-from-left-4"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="flex-1">
                  <p className="font-medium text-sm group-hover:text-primary transition-colors">{emp.name}</p>
                  <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                    <span>{emp.designation}</span>
                    <span className="text-muted-foreground/60">•</span>
                    <span>{emp.department}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    className={
                      emp.status === 'active'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                    }
                  >
                    {emp.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Payroll & Insights */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Performance Overview
            </CardTitle>
            <CardDescription>Team metrics this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Avg Attendance</span>
                <span className="font-semibold">92%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>On-Time Arrivals</span>
                <span className="font-semibold">88%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Performance Score</span>
                <span className="font-semibold">4.2/5</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              Upcoming Events
            </CardTitle>
            <CardDescription>Scheduled leave and events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start">
                View Leave Calendar
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                Team Events
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                Training Programs
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
