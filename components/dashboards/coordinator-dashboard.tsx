'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Briefcase, Clock, CheckCircle2, TrendingUp, AlertCircle } from 'lucide-react'
import { StatCard } from '@/components/dashboard/stat-card'
import { mockCases } from '@/lib/mock-data'
import { Badge } from '@/components/ui/badge'

export function CoordinatorDashboard() {
  const casesToday = 24
  const assigned = 18
  const pending = 6
  const completed = 12

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Operations Dashboard</h1>
        <p className="text-muted-foreground mt-2">Case management and assignment tracking</p>
      </div>

      {/* Primary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Cases Today"
          value={casesToday}
          icon={Briefcase}
          color="bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300"
          trend={8}
        />
        <StatCard
          label="Assigned"
          value={assigned}
          icon={CheckCircle2}
          color="bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300"
          trend={5}
        />
        <StatCard
          label="Pending Assignment"
          value={pending}
          icon={Clock}
          color="bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300"
          trend={-2}
        />
        <StatCard
          label="Completed Today"
          value={completed}
          icon={TrendingUp}
          color="bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-300"
          trend={12}
        />
      </div>

      {/* Bank-wise MIS with Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Bank-wise Case Pipeline</CardTitle>
          <CardDescription>Distribution and status by financial institution</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { bank: 'HDFC Bank', received: 8, pending: 2, completed: 6 },
              { bank: 'ICICI Bank', received: 7, pending: 1, completed: 6 },
              { bank: 'SBI', received: 6, pending: 2, completed: 4 },
              { bank: 'Axis Bank', received: 5, pending: 1, completed: 4 },
            ].map((item, idx) => (
              <div key={item.bank} className="stagger-item animate-in fade-in slide-in-from-left-4" style={{ animationDelay: `${idx * 50}ms` }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{item.bank}</span>
                  <span className="text-xs font-semibold text-muted-foreground">{item.completed}/{item.received}</span>
                </div>
                <div className="flex gap-2 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${(item.completed / item.received) * 100}%` }}
                  />
                  <div
                    className="bg-amber-500 rounded-full transition-all duration-500"
                    style={{ width: `${(item.pending / item.received) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Workflow Overview */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Team Performance</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </CardTitle>
            <CardDescription>Top performing engineers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {['Raj Kumar', 'Priya Singh', 'Amit Patel'].map((engineer, idx) => (
                <div key={engineer} className="flex items-center justify-between p-2 rounded hover:bg-muted/50 transition-colors">
                  <span className="text-sm font-medium">{engineer}</span>
                  <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300">
                    {24 - idx} cases
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Alerts & Issues</span>
              <AlertCircle className="w-4 h-4 text-amber-600" />
            </CardTitle>
            <CardDescription>Pending attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                <p className="text-sm font-medium text-amber-900 dark:text-amber-300">6 cases awaiting assignment</p>
              </div>
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                <p className="text-sm font-medium text-red-900 dark:text-red-300">2 overdue verifications</p>
              </div>
              <Button className="w-full mt-2" size="sm">
                View All Issues
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
