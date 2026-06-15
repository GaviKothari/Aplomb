'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Case } from '@/types'
import { StatusBadge } from '@/components/cases/status-badge'
import { Calendar, MapPin, Banknote, User, Building2 } from 'lucide-react'

interface OverviewTabProps {
  caseData: Case
}

const priorityColors: Record<string, string> = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800',
  critical: 'bg-red-200 text-red-900',
}

export function OverviewTab({ caseData }: OverviewTabProps) {
  return (
    <div className="space-y-6">
      {/* Summary card */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Case Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Property Address</span>
              </div>
              <p className="text-sm">{caseData.propertyAddress}</p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Bank</span>
              </div>
              <p className="text-sm">{caseData.bank}</p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Engineer</span>
              </div>
              <p className="text-sm">{caseData.engineer}</p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Banknote className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Property Value</span>
              </div>
              <p className="text-sm">₹{(caseData.amount! / 100000).toFixed(2)}L</p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Created Date</span>
              </div>
              <p className="text-sm">{new Date(caseData.createdDate).toLocaleDateString()}</p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Site Visit Date</span>
              </div>
              <p className="text-sm">
                {caseData.siteVisitDate ? new Date(caseData.siteVisitDate).toLocaleDateString() : 'Not scheduled'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status and Priority */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Status Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <span className="text-sm font-medium text-muted-foreground block mb-2">Current Status</span>
              <StatusBadge status={caseData.status} />
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground block mb-2">Priority Level</span>
              <Badge className={priorityColors[caseData.priority]}>
                {caseData.priority.charAt(0).toUpperCase() + caseData.priority.slice(1)}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {caseData.notes && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{caseData.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
