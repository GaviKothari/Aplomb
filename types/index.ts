export type UserRole =
  | 'admin'
  | 'engineer'
  | 'coordinator'
  | 'verifier'
  | 'report_maker'
  | 'finalizer'
  | 'hr'
  | 'accounts'
  | 'mis_executive'
  | 'viewer'

export type Permission = 
  | 'view_dashboard'
  | 'manage_cases'
  | 'verify_reports'
  | 'manage_employees'
  | 'manage_billing'
  | 'view_analytics'
  | 'system_admin'

export interface RolePermissions {
  [key: string]: Permission[]
}

export type CaseStatus = 'new' | 'assigned' | 'site_visit_scheduled' | 'site_visit_completed' | 'under_verification' | 'finalized' | 'on_hold'

export type Priority = 'low' | 'medium' | 'high' | 'critical'

export interface Case {
  id: string
  propertyAddress: string
  bank: string
  engineer: string
  status: CaseStatus
  priority: Priority
  createdDate: string
  lastUpdated: string
  siteVisitDate?: string
  amount?: number
  notes?: string
}

export interface Employee {
  id: string
  name: string
  email: string
  phone: string
  designation: string
  department: 'Operations' | 'HR' | 'Finance' | 'Management'
  joinDate: string
  status: 'active' | 'inactive'
  aadhaar?: string
  pan?: string
  drivinglicense?: string
}

export interface AttendanceRecord {
  id: string
  employeeId: string
  date: string
  punchIn?: string
  punchOut?: string
  status: 'present' | 'absent' | 'leave' | 'late'
  leaveType?: string
  latitude?: number
  longitude?: number
  workHours?: number
  casesWorked?: string[]
  totalIdleTime?: number
  notes?: string
}

export interface AttendanceSummary {
  employeeId: string
  month: string
  totalDays: number
  presentDays: number
  absentDays: number
  leaveDays: number
  lateDays: number
  totalWorkingHours: number
  averageWorkingHours: number
}

export interface WorkTimeLog {
  caseId: string
  startTime: string
  endTime: string
  duration: number
  location?: string
}

export interface TravelExpense {
  id: string
  employeeId: string
  date: string
  destination: string
  purpose: string
  distance: number
  fuelCost: number
  otherCost: number
  status: 'pending' | 'approved' | 'rejected'
}

export interface Invoice {
  id: string
  invoiceNumber: string
  bank: string
  amount: number
  date: string
  dueDate: string
  status: 'pending' | 'paid' | 'overdue'
  description: string
}

export interface PayrollEntry {
  id: string
  employeeId: string
  month: string
  baseSalary: number
  daysWorked: number
  leaves: number
  deductions: number
  reimbursements: number
  grossSalary: number
  netSalary: number
}

export interface DashboardMetrics {
  activeCases: number
  pendingSiteVisits: number
  underVerification: number
  completedReports: number
  onHold: number
  monthlyRevenue: number
}

export interface OfficeLocation {
  id: string
  name: string
  latitude: number
  longitude: number
  radiusInMeters: number
  city: string
  address: string
  isActive: boolean
  createdDate: string
}

export interface GeoFenceAttendance extends AttendanceRecord {
  distanceFromOffice?: number
  isWithinRadius?: boolean
  punchInLatitude?: number
  punchInLongitude?: number
  punchOutLatitude?: number
  punchOutLongitude?: number
}

export interface PropertyTransaction {
  id: string
  address: string
  city: string
  area: string
  propertyType: 'residential' | 'commercial' | 'land'
  sizeInSqFt: number
  valuationAmount: number
  ratePerSqFt: number
  bank: string
  engineer: string
  date: string
  latitude?: number
  longitude?: number
}

export interface MarketAnalytics {
  totalPropertiesEvaluated: number
  averagePropertyRate: number
  highestValuation: number
  lowestValuation: number
  percentageChange: number
  periodComparison: {
    currentPeriod: number
    previousPeriod: number
  }
}

export interface TravelLog {
  id: string
  engineerId: string
  engineerName: string
  caseId: string
  propertyLocation: string
  startLocation: {
    latitude: number
    longitude: number
    address: string
  }
  endLocation: {
    latitude: number
    longitude: number
    address: string
  }
  distanceKm: number
  fuelRatePerKm: number
  totalExpense: number
  date: string
  status: 'pending' | 'approved' | 'paid' | 'rejected'
  approvedBy?: string
  approvedDate?: string
  notes?: string
}

export interface ExpenseApproval {
  id: string
  travelLogIds: string[]
  engineerId: string
  engineerName: string
  totalDistance: number
  totalExpense: number
  submittedDate: string
  approvalDate?: string
  status: 'pending' | 'approved' | 'paid' | 'rejected'
  approvedBy?: string
  rejectionReason?: string
}
