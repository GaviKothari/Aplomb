'use client'

import { useState, useRef, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { ReportPanel } from './report-panel'
import { BankDataPanel } from './bank-data-panel'
import { VerificationActions } from './verification-actions'
import { toast } from 'sonner'

interface SplitScreenVerifierProps {
  caseId: string
  engineerReport: Record<string, string | number>
  bankData: Record<string, { value: string | number; status?: 'verified' | 'discrepancy' | 'error' }>
}

export function SplitScreenVerifier({ caseId, engineerReport, bankData }: SplitScreenVerifierProps) {
  const [syncScroll, setSyncScroll] = useState(true)
  const [discrepancies, setDiscrepancies] = useState(0)
  const leftPanelRef = useRef<HTMLDivElement>(null)
  const rightPanelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const discCount = Object.values(bankData).filter(d => d.status === 'discrepancy' || d.status === 'error').length
    setDiscrepancies(discCount)
  }, [bankData])

  const handleScroll = (source: 'left' | 'right', scrollTop: number) => {
    if (!syncScroll) return

    if (source === 'left' && rightPanelRef.current) {
      rightPanelRef.current.scrollTop = scrollTop
    } else if (source === 'right' && leftPanelRef.current) {
      leftPanelRef.current.scrollTop = scrollTop
    }
  }

  const handleApprove = () => {
    if (discrepancies === 0) {
      toast.success('Report approved successfully')
    }
  }

  const handleReject = () => {
    toast.error('Report sent back for revision')
  }

  const handleSave = () => {
    toast.success('Changes saved')
  }

  return (
    <div className="space-y-4">
      {/* Split Screen Container */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Panel - Engineer Report */}
        <Card className="border border-border/50 shadow-sm overflow-hidden flex flex-col h-96">
          <div className="border-b border-border/50 bg-gradient-to-r from-blue-500/10 to-transparent p-4">
            <h3 className="font-semibold text-foreground">Engineer's Report</h3>
            <p className="text-xs text-muted-foreground">Original submission</p>
          </div>
          <div
            ref={leftPanelRef}
            onScroll={(e) => handleScroll('left', (e.target as HTMLDivElement).scrollTop)}
            className="flex-1 overflow-y-auto p-4 space-y-3"
          >
            <ReportPanel title="Property Details" data={engineerReport} />
          </div>
        </Card>

        {/* Right Panel - Bank Data */}
        <Card className="border border-border/50 shadow-sm overflow-hidden flex flex-col h-96">
          <div className="border-b border-border/50 bg-gradient-to-r from-amber-500/10 to-transparent p-4">
            <h3 className="font-semibold text-foreground">Bank Reference Data</h3>
            <p className="text-xs text-muted-foreground">Editable verification</p>
          </div>
          <div
            ref={rightPanelRef}
            onScroll={(e) => handleScroll('right', (e.target as HTMLDivElement).scrollTop)}
            className="flex-1 overflow-y-auto p-4 space-y-3"
          >
            <BankDataPanel title="Property Details" data={bankData} />
          </div>
        </Card>
      </div>

      {/* Action Buttons */}
      <VerificationActions
        caseId={caseId}
        onApprove={handleApprove}
        onReject={handleReject}
        onSave={handleSave}
        discrepancies={discrepancies}
      />
    </div>
  )
}
