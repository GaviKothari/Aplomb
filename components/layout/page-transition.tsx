'use client'

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageTransitionProps {
  children: ReactNode
  className?: string
}

export function PageTransition({ children, className }: PageTransitionProps) {
  return (
    <div className={cn('animate-in fade-in slide-in-from-bottom-4 duration-500', className)}>
      {children}
    </div>
  )
}
