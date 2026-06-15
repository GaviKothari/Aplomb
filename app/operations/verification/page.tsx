'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { SplitScreenVerifier } from '@/components/verification/split-screen-verifier'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useVerificationQueue, useVerification } from '@/lib/api/hooks'
import { ArrowRight } from 'lucide-react'

function VerificationDetail({ id }: { id: string }) {
  const { data, isLoading } = useVerification(id)

  if (isLoading) return <Skeleton className="h-96 w-full" />
  if (!data) return <p className="text-muted-foreground text-center py-10">Verification not found.</p>

  const engineerReport: Record<string, string> = {}
  const bankData: Record<string, { value: string | number; status?: 'verified' | 'discrepancy' | 'error' }> = {}

  if (Array.isArray(data.fields)) {
    data.fields.forEach((f: any) => {
      engineerReport[f.fieldKey] = f.engineerValue ?? '—'
      bankData[f.fieldKey] = {
        value: f.bankValue ?? '—',
        status: f.status === 'MATCH' ? 'verified'
          : f.status === 'MISMATCH' ? 'discrepancy'
          : f.status === 'MISSING' ? 'error'
          : undefined,
      }
    })
  }

  return (
    <SplitScreenVerifier
      caseId={data.case?.caseNumber ?? id}
      engineerReport={engineerReport}
      bankData={bankData}
    />
  )
}

function VerificationContent() {
  const searchParams = useSearchParams()
  const selectedId = searchParams.get('id')
  const { data: queue, isLoading } = useVerificationQueue()
  const verifications: any[] = queue ?? []
  const pending = verifications.filter((v: any) => !v.decision || v.decision === 'PENDING')

  if (selectedId) return <VerificationDetail id={selectedId} />

  return (
    <Card>
      <CardContent className="pt-6">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full mb-3" />
          ))
        ) : pending.length === 0 ? (
          <p className="text-center text-muted-foreground py-10">
            No reports pending verification.
          </p>
        ) : (
          <div className="space-y-3">
            {pending.map((v: any) => (
              <div
                key={v.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
              >
                <div>
                  <p className="text-sm font-semibold">
                    {v.case?.propertyAddress ?? v.case?.caseNumber ?? '—'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {v.case?.organization?.name ?? '—'} · {v.case?.engineer
                      ? `${v.case.engineer.firstName ?? ''} ${v.case.engineer.lastName ?? ''}`.trim()
                      : '—'}
                  </p>
                </div>
                <Button size="sm" className="gap-1" asChild>
                  <a href={`/operations/verification?id=${v.id}`}>
                    <ArrowRight className="w-3.5 h-3.5" />
                    Review
                  </a>
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function VerificationPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <DashboardHeader
          title="Verification Queue"
          subtitle="Compare engineer submissions with bank reference data side-by-side"
        />
        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
          <VerificationContent />
        </Suspense>
      </div>
    </AppLayout>
  )
}
