import { UserRole, Permission, RolePermissions } from '@/types'

export const rolePermissions: RolePermissions = {
  admin: [
    'view_dashboard',
    'manage_cases',
    'verify_reports',
    'manage_employees',
    'manage_billing',
    'view_analytics',
    'system_admin',
  ],
  engineer: [
    'view_dashboard',
    'manage_cases',
  ],
  verifier: [
    'view_dashboard',
    'verify_reports',
  ],
  coordinator: [
    'view_dashboard',
    'manage_cases',
  ],
  hr: [
    'view_dashboard',
    'manage_employees',
  ],
  accounts: [
    'view_dashboard',
    'manage_billing',
  ],
}

export const roleDisplayNames: Record<UserRole, string> = {
  admin: 'Administrator',
  engineer: 'Site Engineer',
  verifier: 'Verifier',
  coordinator: 'Coordinator',
  hr: 'HR Manager',
  accounts: 'Accounts Manager',
}

export const allRoles: UserRole[] = [
  'admin',
  'engineer',
  'verifier',
  'coordinator',
  'hr',
  'accounts',
]

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false
}

export function canAccessModule(role: UserRole, module: string): boolean {
  const modulePermissions: Record<string, Permission[]> = {
    operations: ['manage_cases'],
    verification: ['verify_reports'],
    employees: ['manage_employees'],
    billing: ['manage_billing'],
    analytics: ['view_analytics'],
    system: ['system_admin'],
  }
  
  const requiredPermissions = modulePermissions[module] || []
  return requiredPermissions.some(perm => hasPermission(role, perm))
}
