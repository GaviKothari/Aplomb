'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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
