'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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
