'use client'

import { Badge } from '@/components/ui/badge'

interface StatusBadgeProps {
  status: string
}

const statusConfig: Record<string, { color: string; label: string }> = {
  NEW:                    { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', label: 'New' },
  ASSIGNED:               { color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200', label: 'Assigned' },
  SITE_VISIT_SCHEDULED:   { color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200', label: 'Visit Scheduled' },
  SITE_VISIT_IN_PROGRESS: { color: 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200', label: 'Visit In Progress' },
  SITE_VISIT_COMPLETED:   { color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200', label: 'Visit Completed' },
  UNDER_VERIFICATION:     { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', label: 'Under Verification' },
  REVISION_REQUESTED:     { color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200', label: 'Revision Requested' },
  FINALIZED:              { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', label: 'Finalized' },
  SENT_TO_BANK:           { color: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200', label: 'Sent to Bank' },
  ON_HOLD:                { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', label: 'On Hold' },
  CLOSED:                 { color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', label: 'Closed' },
}

const FALLBACK = { color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400', label: '' }

export function StatusBadge({ status }: StatusBadgeProps) {
  const key = (status ?? '').toUpperCase()
  const config = statusConfig[key] ?? { ...FALLBACK, label: status ?? 'Unknown' }
  return <Badge className={config.color}>{config.label}</Badge>
}
