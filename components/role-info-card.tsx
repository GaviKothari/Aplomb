'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useRole } from '@/hooks/useRole'
import { roleDisplayNames, allRoles } from '@/lib/roles'

interface RoleInfo {
  description: string
  features: string[]
}

const roleInformation: Record<string, RoleInfo> = {
  admin: {
    description: 'Complete system access and management',
    features: [
      'View all dashboards and reports',
      'Manage cases and assignments',
      'Review and approve reports',
      'Employee and HR management',
      'Billing and financial tracking',
      'System administration',
      'Analytics and insights',
    ],
  },
  engineer: {
    description: 'Field-based case management',
    features: [
      'View assigned cases',
      'Update site visit reports',
      'Submit property valuations',
      'AI-powered report generation',
      'Travel expense tracking',
      'Attendance tracking',
    ],
  },
  verifier: {
    description: 'Quality assurance and report verification',
    features: [
      'Review engineer reports',
      'Compare with bank data',
      'Approve or send back reports',
      'Add verification comments',
      'Track verification metrics',
    ],
  },
  coordinator: {
    description: 'Operations and case management',
    features: [
      'Manage case assignments',
      'Monitor case pipeline',
      'Bank-wise MIS tracking',
      'Case status dashboard',
      'Assign engineers to cases',
    ],
  },
  hr: {
    description: 'Human resources management',
    features: [
      'Employee directory management',
      'Attendance tracking',
      'Leave management',
      'Travel expense approval',
      'Payroll processing',
    ],
  },
  accounts: {
    description: 'Financial and billing management',
    features: [
      'Invoice management',
      'Payment tracking',
      'Client billing',
      'Financial reports',
      'Payment reconciliation',
    ],
  },
}

export function RoleInfoCard() {
  const { role } = useRole()
  const info = roleInformation[role]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Role: {roleDisplayNames[role]}</CardTitle>
        <CardDescription>{info.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Available Features:</h4>
          <ul className="space-y-2">
            {info.features.map((feature, idx) => (
              <li key={idx} className="text-sm flex gap-2">
                <span className="text-primary">✓</span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
