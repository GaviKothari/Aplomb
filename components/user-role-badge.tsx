'use client'

import { useRole } from '@/hooks/useRole'
import { roleDisplayNames } from '@/lib/roles'
import { Badge } from '@/components/ui/badge'

export function UserRoleBadge() {
  const { role } = useRole()
  
  const roleColors: Record<string, string> = {
    admin: 'bg-purple-100 text-purple-800',
    engineer: 'bg-blue-100 text-blue-800',
    verifier: 'bg-yellow-100 text-yellow-800',
    coordinator: 'bg-orange-100 text-orange-800',
    hr: 'bg-green-100 text-green-800',
    accounts: 'bg-cyan-100 text-cyan-800',
  }

  return (
    <Badge className={roleColors[role]}>
      {roleDisplayNames[role]}
    </Badge>
  )
}
