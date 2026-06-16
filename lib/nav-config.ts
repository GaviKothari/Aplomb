import {
  BarChart3,
  Briefcase,
  Building2,
  Users,
  DollarSign,
  Settings,
  FileText,
  GitBranch,
  Clock,
  MapPin,
  MessageSquare,
  Zap,
  LayoutTemplate,
  type LucideIcon,
} from 'lucide-react'
import { UserRole } from '@/types'

export interface NavItem {
  title: string
  href: string
  icon?: LucideIcon
  badge?: string
  visibleFor?: UserRole[]
  children?: NavItem[]
}

export interface NavSection {
  title: string
  items: NavItem[]
}

export const navConfig: NavSection[] = [
  {
    title: 'Main',
    items: [
      {
        title: 'Dashboard',
        href: '/dashboard',
        icon: BarChart3,
        visibleFor: ['admin', 'engineer', 'verifier', 'coordinator', 'hr', 'accounts'],
      },
    ],
  },
  {
    title: 'Operations',
    items: [
      {
        title: 'Cases',
        href: '/operations/cases',
        icon: Briefcase,
        visibleFor: ['admin', 'engineer', 'coordinator'],
        children: [
          { title: 'List View', href: '/operations/cases', visibleFor: ['admin', 'engineer', 'coordinator'] },
          { title: 'Kanban Board', href: '/operations/case-board', visibleFor: ['admin', 'coordinator'] },
        ],
      },
      {
        title: 'Verification',
        href: '/operations/verification',
        icon: GitBranch,
        badge: '3',
        visibleFor: ['admin', 'verifier'],
      },
      {
        title: 'Reports',
        href: '/operations/reports',
        icon: FileText,
        visibleFor: ['admin', 'engineer', 'verifier'],
      },
    ],
  },
  {
    title: 'AI & Insights',
    items: [
      {
        title: 'Reporting Assistant',
        href: '/ai-tools/reporting-assistant',
        icon: MessageSquare,
        visibleFor: ['admin', 'engineer'],
      },
      {
        title: 'Insights',
        href: '/ai-tools/insights',
        icon: Zap,
        visibleFor: ['admin', 'coordinator'],
      },
    ],
  },
  {
    title: 'Management',
    items: [
      {
        title: 'Property Transactions',
        href: '/management/property-transactions',
        icon: Building2,
        visibleFor: ['admin', 'coordinator'],
      },
      {
        title: 'MIS Dashboard',
        href: '/management/mis-dashboard',
        icon: BarChart3,
        visibleFor: ['admin', 'coordinator'],
      },
      {
        title: 'Demolition Alerts',
        href: '/management/demolition-alerts',
        icon: MapPin,
        badge: '5',
        visibleFor: ['admin', 'coordinator'],
      },
    ],
  },
  {
    title: 'Team',
    items: [
      {
        title: 'Employees',
        href: '/hr-team/employees',
        icon: Users,
        visibleFor: ['admin', 'hr'],
      },
      {
        title: 'Attendance',
        href: '/hr-team/attendance',
        icon: Clock,
        visibleFor: ['admin', 'hr'],
      },
      {
        title: 'Travel & Expenses',
        href: '/hr-team/travel-expenses',
        icon: MapPin,
        visibleFor: ['admin', 'hr', 'engineer'],
      },
    ],
  },
  {
    title: 'Finance',
    items: [
      {
        title: 'Billing & Invoices',
        href: '/finance/billing-invoices',
        icon: DollarSign,
        visibleFor: ['admin', 'accounts'],
      },
      {
        title: 'Payroll',
        href: '/finance/payroll',
        icon: DollarSign,
        visibleFor: ['admin', 'accounts'],
      },
    ],
  },
  {
    title: 'Analytics',
    items: [
      {
        title: 'Analytics Dashboard',
        href: '/analytics',
        icon: BarChart3,
        visibleFor: ['admin', 'coordinator'],
      },
    ],
  },
  {
    title: 'System',
    items: [
      {
        title: 'Report Templates',
        href: '/system/report-templates',
        icon: LayoutTemplate,
        visibleFor: ['admin'],
      },
      {
        title: 'Settings',
        href: '/system/settings',
        icon: Settings,
        visibleFor: ['admin'],
      },
    ],
  },
]
