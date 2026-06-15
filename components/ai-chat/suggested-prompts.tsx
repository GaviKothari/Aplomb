'use client'

import { Button } from '@/components/ui/button'
import { Zap } from 'lucide-react'

interface SuggestedPromptsProps {
  onSelect: (prompt: string) => void
}

const SUGGESTED_PROMPTS = [
  {
    title: 'Property Overview',
    description: 'Generate property overview section',
    prompt: 'Generate a comprehensive property overview section including location, size, condition, and key features.'
  },
  {
    title: 'Market Analysis',
    description: 'Analyze market comparables',
    prompt: 'Analyze the current market for this property type and location, including comparable properties and market trends.'
  },
  {
    title: 'Valuation Summary',
    description: 'Create valuation summary',
    prompt: 'Create a detailed valuation summary with final appraised value and supporting analysis.'
  },
  {
    title: 'Site Conditions',
    description: 'Document site conditions',
    prompt: 'Document the site conditions including photos, measurements, property condition ratings, and any issues found during inspection.'
  },
]

export function SuggestedPrompts({ onSelect }: SuggestedPromptsProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quick Actions</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <Button
            key={prompt.title}
            onClick={() => onSelect(prompt.prompt)}
            variant="outline"
            className="h-auto flex-col items-start gap-2 px-3 py-2 hover:bg-primary/5 hover:border-primary/30 transition-all duration-200"
          >
            <div className="flex items-center gap-2 w-full">
              <Zap className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="text-sm font-medium text-left">{prompt.title}</span>
            </div>
            <span className="text-xs text-muted-foreground text-left">{prompt.description}</span>
          </Button>
        ))}
      </div>
    </div>
  )
}
