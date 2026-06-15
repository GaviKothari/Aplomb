'use client'

import { Badge } from '@/components/ui/badge'
import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ReportFieldProps {
  label: string
  value: string | number
  status?: 'verified' | 'discrepancy' | 'error'
}

export function ReportField({ label, value, status }: ReportFieldProps) {
  return (
    <div className={cn(
      'p-3 rounded-lg border transition-all duration-200',
      status === 'verified' && 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20',
      status === 'discrepancy' && 'border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20',
      status === 'error' && 'border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20',
      !status && 'border-border/50 bg-card/50'
    )}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</label>
        {status === 'verified' && <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
        {status === 'discrepancy' && <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
        {status === 'error' && <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />}
      </div>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  )
}
