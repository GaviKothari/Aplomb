import { UserRole, Permission, RolePermissions } from '@/types'

export const rolePermissions: RolePermissions = {
  admin:        ['view_dashboard', 'manage_cases', 'verify_reports', 'manage_employees', 'manage_billing', 'view_analytics', 'system_admin'],
  coordinator:  ['view_dashboard', 'manage_cases', 'view_analytics'],
  engineer:     ['view_dashboard', 'manage_cases'],
  report_maker: ['view_dashboard', 'manage_cases'],
  verifier:     ['view_dashboard', 'verify_reports'],
  finalizer:    ['view_dashboard', 'verify_reports'],
  hr:           ['view_dashboard', 'manage_employees'],
  accounts:     ['view_dashboard', 'manage_billing'],
  mis_executive:['view_dashboard', 'view_analytics'],
  viewer:       ['view_dashboard'],
}

export const roleDisplayNames: Record<UserRole, string> = {
  admin:        'Administrator',
  coordinator:  'Coordinator',
  engineer:     'Site Engineer',
  report_maker: 'Report Maker',
  verifier:     'Verifier',
  finalizer:    'Finalizer',
  hr:           'HR Manager',
  accounts:     'Accounts',
  mis_executive:'MIS Executive',
  viewer:       'Viewer',
}

export const allRoles: UserRole[] = [
  'admin', 'coordinator', 'engineer', 'report_maker',
  'verifier', 'finalizer', 'hr', 'accounts', 'mis_executive', 'viewer',
]

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false
}

export function canAccessModule(role: UserRole, module: string): boolean {
  const modulePermissions: Record<string, Permission[]> = {
    operations:   ['manage_cases'],
    verification: ['verify_reports'],
    employees:    ['manage_employees'],
    billing:      ['manage_billing'],
    analytics:    ['view_analytics'],
    system:       ['system_admin'],
  }
  return (modulePermissions[module] ?? []).some(p => hasPermission(role, p))
}
