'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Send, Paperclip } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [message, setMessage] = useState('')
  const [rows, setRows] = useState(1)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      const scrollHeight = textareaRef.current.scrollHeight
      const newRows = Math.min(Math.max(1, Math.ceil(scrollHeight / 24)), 5)
      setRows(newRows)
      textareaRef.current.style.height = `${scrollHeight}px`
    }
  }, [message])

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message)
      setMessage('')
      setRows(1)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSend()
    }
  }

  return (
    <div className="border-t border-border/50 bg-background/50 backdrop-blur-sm p-4 space-y-3">
      <div className="flex gap-3 items-end">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me to generate a report section... (Ctrl+Enter to send)"
            rows={rows}
            disabled={disabled}
            className={cn(
              'w-full px-4 py-2 bg-secondary text-foreground placeholder-muted-foreground rounded-lg border border-border/50',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
              'resize-none transition-all duration-200 max-h-32',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          />
          <Button
            size="icon"
            variant="ghost"
            className="absolute right-2 bottom-2 h-8 w-8 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Paperclip className="w-4 h-4" />
          </Button>
        </div>
        <Button
          onClick={handleSend}
          disabled={!message.trim() || disabled}
          className="h-10 w-10 p-0 flex items-center justify-center transition-all duration-200"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
