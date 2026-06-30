'use client'

import { useAuth } from '@/context/auth-context'
import { Permission } from '@/types'

export function useRole() {
  const { currentRole, hasPermission, setCurrentRole, isAdmin } = useAuth()

  return {
    role:           currentRole,
    setRole:        setCurrentRole,
    hasPermission:  (permission: Permission) => hasPermission(permission),
    isAdmin,
    isEngineer:     currentRole === 'engineer',
    isCoordinator:  currentRole === 'coordinator',
    isVerifier:     currentRole === 'verifier',
    isReportMaker:  currentRole === 'report_maker',
    isFinalizer:    currentRole === 'finalizer',
    isHR:           currentRole === 'hr',
    isAccounts:     currentRole === 'accounts',
    isMisExecutive: currentRole === 'mis_executive',
    isViewer:       currentRole === 'viewer',
  }
}
