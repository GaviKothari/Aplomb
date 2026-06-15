'use client'

import { toast } from 'sonner'
import { AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface AnimatedToastOptions {
  title: string
  description?: string
  type: ToastType
  duration?: number
}

export function showAnimatedToast({ title, description, type, duration = 4000 }: AnimatedToastOptions) {
  const icons = {
    success: <CheckCircle className="w-5 h-5 text-emerald-600" />,
    error: <AlertCircle className="w-5 h-5 text-red-600" />,
    info: <Info className="w-5 h-5 text-blue-600" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-600" />,
  }

  const colors = {
    success: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950 dark:border-emerald-800',
    error: 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800',
    info: 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800',
    warning: 'bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800',
  }

  const textColors = {
    success: 'text-emerald-900 dark:text-emerald-100',
    error: 'text-red-900 dark:text-red-100',
    info: 'text-blue-900 dark:text-blue-100',
    warning: 'text-amber-900 dark:text-amber-100',
  }

  toast.custom(
    (t) => (
      <div
        className={`
          animate-in fade-in slide-in-from-right-4 duration-300
          flex items-start gap-3 rounded-lg border p-4
          ${colors[type]}
          transition-all duration-300
          shadow-lg
        `}
      >
        <div className="flex-shrink-0">{icons[type]}</div>
        <div className="flex-1">
          <p className={`font-semibold ${textColors[type]}`}>{title}</p>
          {description && (
            <p className={`text-sm ${textColors[type]} opacity-80 mt-1`}>{description}</p>
          )}
        </div>
      </div>
    ),
    { duration }
  )
}

export const animatedToast = {
  success: (title: string, description?: string) =>
    showAnimatedToast({ title, description, type: 'success' }),
  error: (title: string, description?: string) =>
    showAnimatedToast({ title, description, type: 'error' }),
  info: (title: string, description?: string) =>
    showAnimatedToast({ title, description, type: 'info' }),
  warning: (title: string, description?: string) =>
    showAnimatedToast({ title, description, type: 'warning' }),
}
