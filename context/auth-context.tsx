'use client'

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { UserRole } from '@/types'
import { rolePermissions, hasPermission } from '@/lib/roles'

interface AuthContextType {
  currentRole: UserRole
  setCurrentRole: (role: UserRole) => void
  hasPermission: (permission: string) => boolean
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, isLoaded } = useUser()
  const [currentRole, setCurrentRole] = useState<UserRole>('admin')

  useEffect(() => {
    if (!isLoaded || !user) return
    const clerkRole = (user.publicMetadata?.role ?? user.unsafeMetadata?.role) as UserRole | undefined
    if (clerkRole) setCurrentRole(clerkRole)
  }, [isLoaded, user])

  const checkPermission = (permission: string) => {
    return hasPermission(currentRole, permission as any)
  }

  const value: AuthContextType = {
    currentRole,
    setCurrentRole,
    hasPermission: checkPermission,
    isAdmin: currentRole === 'admin',
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
