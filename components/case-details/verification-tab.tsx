'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useCaseVerification } from '@/lib/api/hooks'
import {
  CheckCircle2, XCircle, RotateCcw, Clock, ShieldCheck, User,
} from 'lucide-react'

const DECISION_META: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  APPROVED:           { label: 'Approved',          cls: 'bg-emerald-100 text-emerald-800', icon: CheckCircle2 },
  REJECTED:           { label: 'Rejected',          cls: 'bg-red-100 text-red-800',         icon: XCircle },
  REVISION_REQUESTED: { label: 'Revision Requested', cls: 'bg-orange-100 text-orange-800',  icon: RotateCcw },
}

interface VerificationTabProps {
  caseId: string
}

export function VerificationTab({ caseId }: VerificationTabProps) {
  const { data: verification, isLoading } = useCaseVerification(caseId)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    )
  }

  if (!verification) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="py-16 text-center">
          <ShieldCheck className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Not yet under verification</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Once the report is submitted and a verifier is assigned, details will appear here
          </p>
        </CardContent>
      </Card>
    )
  }

  const v = verification as any
  const decisionMeta = v.decision ? DECISION_META[v.decision] : null
  const DecisionIcon = decisionMeta?.icon ?? Clock

  return (
    <div className="space-y-4">
      {/* Status card */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Decision</p>
              {decisionMeta ? (
                <Badge className={`gap-1.5 text-sm px-3 py-1 ${decisionMeta.cls}`}>
                  <DecisionIcon className="w-3.5 h-3.5" />
                  {decisionMeta.label}
                </Badge>
              ) : (
                <Badge className="gap-1.5 text-sm px-3 py-1 bg-amber-100 text-amber-800">
                  <Clock className="w-3.5 h-3.5" />
                  In Progress
                </Badge>
              )}
            </div>
            {v.verifier && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground mb-0.5">Verifier</p>
                <div className="flex items-center gap-1.5 justify-end">
                  <User className="w-3 h-3 text-muted-foreground" />
                  <span className="text-sm font-medium">{v.verifier.name}</span>
                </div>
              </div>
            )}
          </div>

          {v.decisionNote && (
            <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border/40">
              <p className="text-xs text-muted-foreground mb-1 font-medium">Verifier Note</p>
              <p className="text-sm">{v.decisionNote}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timestamps */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[
            { label: 'Verification started', date: v.createdAt },
            { label: 'Decision made', date: v.decidedAt },
          ].map(({ label, date }) =>
            date ? (
              <div key={label} className="flex justify-between py-1.5 border-b border-border/40 last:border-0">
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className="text-sm font-medium">
                  {new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </div>
            ) : null,
          )}
        </CardContent>
      </Card>

      {/* Report link */}
      {v.report && (
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Report</p>
                <p className="text-sm font-mono font-semibold">{v.report.reportNumber}</p>
              </div>
              {v.report.totalMarketValue && (
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Market Value</p>
                  <p className="text-sm font-semibold">
                    ₹{(v.report.totalMarketValue / 100_000).toFixed(2)} L
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
