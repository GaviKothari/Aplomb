'use client'

import { useParams } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DetailPageSkeleton } from '@/components/ui/page-skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StatusBadge } from '@/components/cases/status-badge'
import { OverviewTab } from '@/components/case-details/overview-tab'
import { ReportTab } from '@/components/case-details/report-tab'
import { MediaTab } from '@/components/case-details/media-tab'
import { VerificationTab } from '@/components/case-details/verification-tab'
import { HistoryTab } from '@/components/case-details/history-tab'
import { DemolitionAlertBanner } from '@/components/case-details/demolition-alert-banner'
import { useCase } from '@/lib/api/hooks'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { Case, CaseStatus, Priority } from '@/types'

export default function CaseDetailPage() {
  const params = useParams()
  const caseId = params.caseId as string
  const { data: apiCase, isLoading, error } = useCase(caseId)

  if (isLoading) {
    return (
      <AppLayout>
        <DetailPageSkeleton />
      </AppLayout>
    )
  }

  if (error || !apiCase) {
    return (
      <AppLayout>
        <div className="text-center py-20 text-muted-foreground">
          {error ? 'Failed to load case.' : 'Case not found.'}
        </div>
      </AppLayout>
    )
  }

  // Map API response → frontend Case type
  const caseData: Case = {
    id: apiCase.caseNumber ?? apiCase.id,
    propertyAddress: apiCase.propertyAddress,
    bank: apiCase.organization?.name ?? 'Unknown',
    engineer: apiCase.engineer
      ? `${apiCase.engineer.firstName ?? ''} ${apiCase.engineer.lastName ?? ''}`.trim() || apiCase.engineer.email
      : 'Unassigned',
    status: (apiCase.status?.toLowerCase().replace(/_/g, '_') ?? 'new') as CaseStatus,
    priority: (apiCase.priority?.toLowerCase() ?? 'medium') as Priority,
    createdDate: apiCase.createdAt,
    lastUpdated: apiCase.updatedAt,
    siteVisitDate: apiCase.siteVisitLogs?.[0]?.startTime ?? undefined,
    amount: undefined,
  }

  const alert = apiCase.demolitionAlerts?.[0]
  const demolitionProperty = alert?.demolitionProperty

  return (
    <AppLayout>
      <div className="space-y-6">
        <Button variant="ghost" size="sm" className="gap-2" asChild>
          <Link href="/operations/cases">
            <ArrowLeft className="w-4 h-4" />
            Back to Cases
          </Link>
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{caseData.id}</h1>
            <p className="text-muted-foreground mt-2">{caseData.propertyAddress}</p>
          </div>
          <Button className="gap-2">Mark as Finalized</Button>
        </div>

        {alert && (
          <DemolitionAlertBanner
            caseId={caseId}
            hasAlert={true}
            noticeId={demolitionProperty?.noticeId ?? ''}
            authority={demolitionProperty?.authority ?? ''}
            demolitionDate={demolitionProperty?.demolitionDate ?? ''}
            isReviewed={alert.reviewed ?? false}
          />
        )}

        <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
          <CardContent className="pt-6 flex items-center gap-6 flex-wrap">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Current Status</p>
              <StatusBadge status={caseData.status} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Priority</p>
              <Badge className={caseData.priority === 'critical' ? 'bg-red-200 text-red-900' : 'bg-yellow-100 text-yellow-800'}>
                {caseData.priority}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Bank</p>
              <p className="font-semibold text-sm">{caseData.bank}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Engineer</p>
              <p className="font-semibold text-sm">{caseData.engineer}</p>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="report">Report</TabsTrigger>
            <TabsTrigger value="media">Media</TabsTrigger>
            <TabsTrigger value="verification">Verification</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <OverviewTab caseData={caseData} />
          </TabsContent>

          <TabsContent value="report" className="space-y-4">
            <ReportTab caseId={caseId} />
          </TabsContent>

          <TabsContent value="media" className="space-y-4">
            <MediaTab />
          </TabsContent>

          <TabsContent value="verification" className="space-y-4">
            <VerificationTab />
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <HistoryTab caseId={caseId} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}
