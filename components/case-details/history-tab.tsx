'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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
