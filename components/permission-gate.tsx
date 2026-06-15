'use client'

import React from 'react'
import { useRole } from '@/hooks/useRole'
import { ReactNode } from 'react'

interface PermissionGateProps {
  permission: string
  children: ReactNode
  fallback?: ReactNode
}

export function PermissionGate({ permission, children, fallback }: PermissionGateProps) {
  const { hasPermission } = useRole()

  if (!hasPermission(permission as any)) {
    return fallback ?? null
  }

  return <>{children}</>
}
