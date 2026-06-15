'use client'

import { cn } from '@/lib/utils'
import { CheckCircle2, Clock } from 'lucide-react'

interface MessageBubbleProps {
  content: string
  isUser: boolean
  timestamp: Date
  status?: 'sending' | 'sent' | 'delivered'
}

export function MessageBubble({ content, isUser, timestamp, status = 'delivered' }: MessageBubbleProps) {
  const isAssistant = !isUser

  return (
    <div
      className={cn(
        'flex gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {isAssistant && (
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-semibold text-primary">AI</span>
        </div>
      )}

      <div
        className={cn(
          'max-w-xs lg:max-w-md px-4 py-3 rounded-lg shadow-sm transition-all duration-200',
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-none'
            : 'bg-secondary text-secondary-foreground rounded-bl-none border border-border/50'
        )}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{content}</p>
        <div className={cn('flex items-center gap-1 mt-2 text-xs opacity-70')}>
          <span>{timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          {isUser && status === 'sending' && <Clock className="w-3 h-3" />}
          {isUser && status === 'delivered' && <CheckCircle2 className="w-3 h-3" />}
        </div>
      </div>
    </div>
  )
}
