'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface PremiumCardProps {
  title: string
  description?: string
  children: React.ReactNode
  action?: React.ReactNode
  footer?: React.ReactNode
  className?: string
  variant?: 'default' | 'elevated'
}

export function PremiumCard({
  title,
  description,
  children,
  action,
  footer,
  className,
  variant = 'default',
}: PremiumCardProps) {
  return (
    <Card className={cn(
      'border border-border/50 transition-all duration-300 group',
      variant === 'elevated' && 'shadow-lg hover:shadow-xl hover:border-primary/30 bg-gradient-to-br from-card via-card to-card/50',
      variant === 'default' && 'hover:shadow-md hover:border-primary/20 bg-card/50 backdrop-blur',
      className
    )}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 flex-1">
            <CardTitle className="group-hover:text-primary transition-colors">
              {title}
            </CardTitle>
            {description && (
              <CardDescription className="group-hover:text-foreground/60 transition-colors">
                {description}
              </CardDescription>
            )}
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {children}
        {footer && (
          <div className="pt-4 border-t border-border/30">
            {footer}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
