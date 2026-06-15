'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MetricCardProps {
  title: string
  value: string | number
  unit?: string
  trend?: number
  trendLabel?: string
  icon?: React.ReactNode
  onClick?: () => void
}

export function MetricCard({ title, value, unit, trend, trendLabel, icon, onClick }: MetricCardProps) {
  const isTrendPositive = trend !== undefined && trend > 0

  return (
    <Card
      onClick={onClick}
      className={cn(
        'border border-border/50 shadow-sm hover:shadow-lg hover:border-primary/20 transition-all duration-300 group stagger-item animate-in fade-in slide-in-from-bottom-4 cursor-pointer'
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground/70 transition-colors duration-200">
            {title}
          </CardTitle>
          {icon && (
            <div className="p-2 rounded-lg bg-primary/10 group-hover:scale-110 transition-transform duration-200">
              {icon}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {value}
            </span>
            {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
          </div>
          {trend !== undefined && (
            <div className="flex items-center gap-1">
              {isTrendPositive ? (
                <ArrowUpRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <ArrowDownLeft className="w-4 h-4 text-red-600 dark:text-red-400" />
              )}
              <span
                className={cn(
                  'text-xs font-semibold',
                  isTrendPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                )}
              >
                {Math.abs(trend)}% {trendLabel || 'change'}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
