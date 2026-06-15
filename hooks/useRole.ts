'use client'

import { useAuth } from '@/context/auth-context'
import { UserRole, Permission } from '@/types'

export function useRole() {
  const { currentRole, hasPermission, setCurrentRole, isAdmin } = useAuth()

  return {
    role: currentRole,
    setRole: setCurrentRole,
    hasPermission: (permission: Permission) => hasPermission(permission),
    isAdmin,
    isEngineer: currentRole === 'engineer',
    isVerifier: currentRole === 'verifier',
    isCoordinator: currentRole === 'coordinator',
    isHR: currentRole === 'hr',
    isAccounts: currentRole === 'accounts',
  }
}
