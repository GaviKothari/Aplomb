'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DateRangePickerProps {
  onRangeChange: (range: { start: string; end: string }) => void
}

const PRESETS = [
  { label: 'Last 7 Days', days: 7 },
  { label: 'Last 30 Days', days: 30 },
  { label: 'Last 90 Days', days: 90 },
  { label: 'Last Year', days: 365 },
]

export function DateRangePicker({ onRangeChange }: DateRangePickerProps) {
  const [selectedDays, setSelectedDays] = useState(30)

  const handlePresetSelect = (days: number) => {
    setSelectedDays(days)
    const end = new Date()
    const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000)
    
    onRangeChange({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    })
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Calendar className="w-4 h-4 text-muted-foreground" />
      {PRESETS.map((preset) => (
        <Button
          key={preset.days}
          onClick={() => handlePresetSelect(preset.days)}
          variant={selectedDays === preset.days ? 'default' : 'outline'}
          size="sm"
          className="transition-all duration-200"
        >
          {preset.label}
        </Button>
      ))}
    </div>
  )
}
