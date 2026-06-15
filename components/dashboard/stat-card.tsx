'use client'

import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  /** New API: separate icon color + bg classes */
  iconColor?: string
  iconBg?: string
  /** Legacy API: single combined color string (bg + text) */
  color?: string
  sub?: string
  subPositive?: boolean
  trend?: number
}

export function StatCard({ label, value, icon: Icon, iconColor, iconBg, color, sub, subPositive, trend }: StatCardProps) {
  const resolvedIconBg = iconBg ?? (color ? color.split(' ').filter(c => c.startsWith('bg-')).join(' ') : 'bg-muted')
  const resolvedIconColor = iconColor ?? (color ? color.split(' ').filter(c => c.startsWith('text-')).join(' ') : 'text-foreground')
  const resolvedSub = sub ?? (trend !== undefined ? `${trend > 0 ? '+' : ''}${trend}% vs last month` : undefined)
  const resolvedSubPositive = subPositive ?? (trend !== undefined ? trend >= 0 : undefined)
  return (
    <div className="bg-card border border-border/60 rounded-xl p-5 flex flex-col gap-3 hover:shadow-md hover:border-border transition-all duration-200">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', resolvedIconBg)}>
          <Icon className={cn('w-4 h-4', resolvedIconColor)} />
        </div>
      </div>
      <div className="text-3xl font-bold tracking-tight">{value}</div>
      {resolvedSub && (
        <p className={cn('text-xs font-medium', resolvedSubPositive === true ? 'text-emerald-600 dark:text-emerald-400' : resolvedSubPositive === false ? 'text-red-500' : 'text-muted-foreground')}>
          {resolvedSub}
        </p>
      )}
    </div>
  )
}
