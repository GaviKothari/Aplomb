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

export function MediaTab() {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Photos & Media</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="aspect-square bg-muted rounded-lg flex items-center justify-center border border-border"
            >
              <div className="text-center">
                <div className="text-2xl mb-2">📷</div>
                <p className="text-xs text-muted-foreground">Photo {i}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function VerificationTab() {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Verification Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-semibold text-sm mb-2">Document Verification</h4>
          <ul className="space-y-2">
            <li className="flex items-center gap-2 text-sm">
              <span className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold">✓</span>
              <span>Property deed verified</span>
            </li>
            <li className="flex items-center gap-2 text-sm">
              <span className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold">✓</span>
              <span>Tax receipts verified</span>
            </li>
            <li className="flex items-center gap-2 text-sm">
              <span className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold">✓</span>
              <span>Ownership confirmed</span>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-sm mb-2">Bank Comments</h4>
          <p className="text-sm text-muted-foreground">
            All documents are in order. Proceed with valuation finalization.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export function HistoryTab() {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Case History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[
            { date: '2024-03-15', status: 'Under Verification', text: 'Case moved to verification queue' },
            { date: '2024-03-14', status: 'Site Visit Completed', text: 'Site visit completed by engineer' },
            { date: '2024-03-12', status: 'Site Visit Scheduled', text: 'Site visit scheduled for 14th March' },
            { date: '2024-03-10', status: 'Assigned', text: 'Case assigned to Raj Kumar' },
            { date: '2024-03-01', status: 'New', text: 'Case created in system' },
          ].map((event, i) => (
            <div key={i} className="flex gap-4 pb-4 border-b border-border last:border-0">
              <div className="w-24 text-xs font-semibold text-muted-foreground flex-shrink-0">
                {new Date(event.date).toLocaleDateString()}
              </div>
              <div>
                <p className="text-sm font-semibold mb-1">{event.status}</p>
                <p className="text-sm text-muted-foreground">{event.text}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
