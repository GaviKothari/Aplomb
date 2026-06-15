'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ReportField } from './report-field'

interface ReportPanelProps {
  title: string
  data: Record<string, string | number>
}

export function ReportPanel({ title, data }: ReportPanelProps) {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-foreground">{title}</h3>
      <div className="space-y-2">
        {Object.entries(data).map(([key, value]) => (
          <ReportField key={key} label={key} value={value} status="verified" />
        ))}
      </div>
    </div>
  )
}
