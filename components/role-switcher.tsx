'use client'

import React from 'react'
import { useRole } from '@/hooks/useRole'
import { allRoles, roleDisplayNames } from '@/lib/roles'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function RoleSwitcher() {
  const { role, setRole } = useRole()

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-foreground/70">Test Role:</span>
      <Select value={role} onValueChange={(value) => setRole(value as any)}>
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {allRoles.map((r) => (
            <SelectItem key={r} value={r}>
              {roleDisplayNames[r]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
