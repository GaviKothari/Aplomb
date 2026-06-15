'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function ReportTab() {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Engineer Report</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-sm mb-2">Property Condition Assessment</h4>
            <p className="text-sm text-muted-foreground">
              The property is in good condition with minor repairs needed on the roof. The structural integrity is sound, and all systems are functional.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-2">Market Analysis</h4>
            <p className="text-sm text-muted-foreground">
              Based on comparable properties in the area, the current market value is within the estimated range of ₹45-50L.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-2">Recommendations</h4>
            <p className="text-sm text-muted-foreground">
              Recommend addressing the roof repairs before finalization. All documentation has been verified and is in order.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
