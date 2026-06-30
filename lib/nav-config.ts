import {
  BarChart3, Briefcase, Building2, Users, DollarSign, Settings,
  FileText, GitBranch, Clock, MapPin, MessageSquare, Zap,
  LayoutTemplate, Upload, CalendarDays, type LucideIcon,
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

// Shorthand sets used throughout
const ALL: UserRole[] = ['admin', 'coordinator', 'engineer', 'report_maker', 'verifier', 'finalizer', 'hr', 'accounts', 'mis_executive', 'viewer']
const OPS: UserRole[] = ['admin', 'coordinator', 'engineer', 'report_maker', 'verifier', 'finalizer']

export const navConfig: NavSection[] = [
  {
    title: 'Main',
    items: [
      {
        title: 'Dashboard',
        href: '/dashboard',
        icon: BarChart3,
        visibleFor: ALL,
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
        visibleFor: OPS,
        children: [
          { title: 'List View',    href: '/operations/cases',      visibleFor: OPS },
          { title: 'Kanban Board', href: '/operations/case-board', visibleFor: ['admin', 'coordinator'] },
          { title: 'Bulk Import',  href: '/operations/import',     icon: Upload, visibleFor: ['admin', 'coordinator'] },
        ],
      },
      {
        title: 'Verification',
        href: '/operations/verification',
        icon: GitBranch,
        visibleFor: ['admin', 'verifier', 'finalizer'],
      },
      {
        title: 'Reports',
        href: '/operations/reports',
        icon: FileText,
        visibleFor: ['admin', 'coordinator', 'engineer', 'report_maker', 'verifier', 'finalizer'],
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
        visibleFor: ['admin', 'engineer', 'report_maker'],
      },
      {
        title: 'Insights',
        href: '/ai-tools/insights',
        icon: Zap,
        visibleFor: ['admin', 'coordinator', 'mis_executive'],
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
        visibleFor: ['admin', 'coordinator', 'mis_executive'],
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
        visibleFor: ['admin', 'hr', 'engineer', 'report_maker', 'coordinator', 'finalizer', 'verifier'],
      },
      {
        title: 'Leave Management',
        href: '/hr-team/leave',
        icon: CalendarDays,
        visibleFor: ['admin', 'hr'],
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
        visibleFor: ['admin', 'coordinator', 'mis_executive'],
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
