'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, XCircle, MessageSquare, ArrowRight } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { AdminDashboard } from '@/components/dashboards/admin-dashboard'
import { EngineerDashboard } from '@/components/dashboards/engineer-dashboard'
import { CoordinatorDashboard } from '@/components/dashboards/coordinator-dashboard'
import { HRDashboard } from '@/components/dashboards/hr-dashboard'
import { AccountsDashboard } from '@/components/dashboards/accounts-dashboard'
import { useRole } from '@/hooks/useRole'
import { StatCard } from '@/components/dashboard/stat-card'
import { useVerificationQueue } from '@/lib/api/hooks'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

function VerifierDashboard() {
  const { data: queue, isLoading } = useVerificationQueue()
  const verifications: any[] = queue ?? []

  const pending = verifications.filter((v: any) => v.decision === null || v.decision === 'PENDING')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Verification Queue</h1>
        <p className="text-muted-foreground mt-2">Review and approve site visit reports</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Pending Review"
          value={isLoading ? '…' : pending.length}
          icon={MessageSquare}
          color="bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300"
        />
        <StatCard
          label="Approved Today"
          value={isLoading ? '…' : verifications.filter((v: any) => v.decision === 'APPROVED').length}
          icon={CheckCircle2}
          color="bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300"
        />
        <StatCard
          label="Sent Back"
          value={isLoading ? '…' : verifications.filter((v: any) => v.decision === 'REJECTED').length}
          icon={XCircle}
          color="bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-300"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reports for Verification</CardTitle>
          <CardDescription>Review engineer reports and approve or reject</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))
            ) : pending.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No reports pending verification.</p>
            ) : (
              pending.slice(0, 8).map((v: any) => (
                <div
                  key={v.id}
                  className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 hover:border-primary/30 transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {v.case?.propertyAddress ?? v.report?.caseNumber ?? 'Unknown property'}
                    </p>
                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                      <span><span className="font-medium">Bank:</span> {v.case?.organization?.name ?? '—'}</span>
                      <span><span className="font-medium">Engineer:</span> {v.case?.engineer ? `${v.case.engineer.firstName ?? ''} ${v.case.engineer.lastName ?? ''}`.trim() : '—'}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button size="sm" variant="default" className="gap-1" asChild>
                      <a href={`/operations/verification?id=${v.id}`}>
                        <ArrowRight className="w-3.5 h-3.5" />
                        Review
                      </a>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function DashboardPage() {
  const { role } = useRole()

  const dashboards: Record<string, React.ReactNode> = {
    admin: <AdminDashboard />,
    engineer: <EngineerDashboard />,
    verifier: <VerifierDashboard />,
    coordinator: <CoordinatorDashboard />,
    hr: <HRDashboard />,
    accounts: <AccountsDashboard />,
  }

  return (
    <AppLayout>
      {dashboards[role] ?? <AdminDashboard />}
    </AppLayout>
  )
}
