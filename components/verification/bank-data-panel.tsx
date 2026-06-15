'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ReportField } from './report-field'
import { AlertCircle } from 'lucide-react'

interface BankDataPanelProps {
  title: string
  data: Record<string, { value: string | number; status?: 'verified' | 'discrepancy' | 'error' }>
}

export function BankDataPanel({ title, data }: BankDataPanelProps) {
  const discrepancyCount = Object.values(data).filter(d => d.status === 'discrepancy' || d.status === 'error').length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">{title}</h3>
        {discrepancyCount > 0 && (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="w-3 h-3" />
            {discrepancyCount} Issues
          </Badge>
        )}
      </div>
      <div className="space-y-2">
        {Object.entries(data).map(([key, { value, status }]) => (
          <ReportField key={key} label={key} value={value} status={status} />
        ))}
      </div>
    </div>
  )
}
