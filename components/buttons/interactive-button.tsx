'use client'

import { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Check, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

type ButtonState = 'idle' | 'loading' | 'success' | 'error'

interface InteractiveButtonProps {
  children: ReactNode
  onClick?: () => Promise<void> | void
  state?: ButtonState
  variant?: 'default' | 'outline' | 'ghost' | 'destructive'
  size?: 'sm' | 'default' | 'lg'
  className?: string
  disabled?: boolean
  showIcon?: boolean
}

export function InteractiveButton({
  children,
  onClick,
  state = 'idle',
  variant = 'default',
  size = 'default',
  className,
  disabled,
  showIcon = true,
}: InteractiveButtonProps) {
  const isProcessing = state === 'loading'

  return (
    <Button
      onClick={onClick}
      disabled={disabled || isProcessing}
      variant={variant}
      size={size}
      className={cn(
        'transition-smooth relative overflow-hidden group',
        state === 'success' && 'bg-emerald-500 hover:bg-emerald-600 text-white',
        state === 'error' && 'bg-red-500 hover:bg-red-600 text-white',
        className
      )}
    >
      {/* Background shimmer effect during loading */}
      {isProcessing && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
      )}

      <div
        className={cn(
          'flex items-center justify-center gap-2 transition-all duration-200',
          isProcessing && 'opacity-0'
        )}
      >
        {state === 'success' && showIcon && <Check className="w-4 h-4" />}
        {state === 'error' && showIcon && <AlertCircle className="w-4 h-4" />}
        {state === 'idle' && children}
        {state === 'loading' && children}
        {state === 'success' && 'Success!'}
        {state === 'error' && 'Failed'}
      </div>

      {isProcessing && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Spinner className="w-4 h-4" />
        </div>
      )}
    </Button>
  )
}
