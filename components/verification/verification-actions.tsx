'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, Save } from 'lucide-react'

interface VerificationActionsProps {
  caseId: string
  onApprove: () => void
  onReject: () => void
  onSave: () => void
  discrepancies: number
}

export function VerificationActions({ caseId, onApprove, onReject, onSave, discrepancies }: VerificationActionsProps) {
  return (
    <div className="border-t border-border/50 p-4 bg-background/50 backdrop-blur-sm space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Case ID: {caseId}</p>
          <p className="text-xs text-muted-foreground">Review and finalize report</p>
        </div>
        {discrepancies > 0 && (
          <Badge variant="outline" className="gap-1">
            {discrepancies} discrepancies to resolve
          </Badge>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          onClick={onSave}
          variant="outline"
          className="flex-1 gap-2 hover:bg-primary/5"
        >
          <Save className="w-4 h-4" />
          Save Changes
        </Button>
        <Button
          onClick={onReject}
          variant="destructive"
          className="flex-1 gap-2"
        >
          <XCircle className="w-4 h-4" />
          Reject
        </Button>
        <Button
          onClick={onApprove}
          className="flex-1 gap-2"
          disabled={discrepancies > 0}
        >
          <CheckCircle2 className="w-4 h-4" />
          Approve
        </Button>
      </div>
    </div>
  )
}
