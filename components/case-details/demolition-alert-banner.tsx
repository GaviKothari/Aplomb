'use client'

import { AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

interface DemolitionAlertBannerProps {
  caseId: string
  hasAlert: boolean
  noticeId?: string
  authority?: string
  demolitionDate?: string
  isReviewed?: boolean
}

export function DemolitionAlertBanner({
  caseId,
  hasAlert,
  noticeId,
  authority,
  demolitionDate,
  isReviewed,
}: DemolitionAlertBannerProps) {
  if (!hasAlert) return null

  return (
    <Card className="border-l-4 border-l-red-500 bg-red-50 dark:bg-red-950/20 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-red-900 dark:text-red-300">
                Property Listed Under Demolition Notice
              </h3>
              {isReviewed && (
                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300">
                  Reviewed
                </Badge>
              )}
            </div>
            <p className="text-sm text-red-800 dark:text-red-400 mb-3">
              This property matches a government demolition notice. Immediate action required.
            </p>
            <div className="grid gap-2 text-sm mb-3">
              {noticeId && (
                <div>
                  <span className="font-medium">Notice ID:</span> {noticeId}
                </div>
              )}
              {authority && (
                <div>
                  <span className="font-medium">Authority:</span> {authority}
                </div>
              )}
              {demolitionDate && (
                <div>
                  <span className="font-medium">Demolition Date:</span> {demolitionDate}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button size="sm" variant="default" className="gap-1" asChild>
            <Link href="/management/demolition-alerts">
              View Full Details
              <ChevronRight className="w-4 h-4" />
            </Link>
          </Button>
          <Button size="sm" variant="outline">
            Mark Reviewed
          </Button>
        </div>
      </div>
    </Card>
  )
}
