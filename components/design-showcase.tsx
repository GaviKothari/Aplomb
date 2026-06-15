'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, AlertCircle, Info, TrendingUp } from 'lucide-react'

export function DesignShowcase() {
  return (
    <div className="space-y-8 p-8 bg-gradient-to-b from-background via-background to-muted/30 rounded-lg">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Design System Showcase</h2>
        <p className="text-muted-foreground">Premium blue + white color scheme with smooth interactions</p>
      </div>

      {/* Color Palette */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Color Palette</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <div className="h-20 rounded-lg bg-primary shadow-md" />
            <p className="text-sm font-medium">Primary</p>
            <p className="text-xs text-muted-foreground">oklch(0.45 0.22 260)</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 rounded-lg bg-secondary shadow-md" />
            <p className="text-sm font-medium">Secondary</p>
            <p className="text-xs text-muted-foreground">oklch(0.96 0.01 260)</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 rounded-lg bg-accent shadow-md" />
            <p className="text-sm font-medium">Accent</p>
            <p className="text-xs text-muted-foreground">oklch(0.52 0.24 260)</p>
          </div>
          <div className="space-y-2">
            <div className="h-20 rounded-lg bg-muted shadow-md" />
            <p className="text-sm font-medium">Muted</p>
            <p className="text-xs text-muted-foreground">oklch(0.93 0 0)</p>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Button States</h3>
        <div className="flex flex-wrap gap-3">
          <Button>Primary Button</Button>
          <Button variant="secondary">Secondary Button</Button>
          <Button variant="outline">Outline Button</Button>
          <Button variant="ghost">Ghost Button</Button>
          <Button disabled>Disabled Button</Button>
        </div>
      </div>

      {/* Badges */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Badges & Status</h3>
        <div className="flex flex-wrap gap-3">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Success
          </Badge>
          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
            <AlertCircle className="w-3 h-3 mr-1" />
            Warning
          </Badge>
          <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
            <AlertCircle className="w-3 h-3 mr-1" />
            Error
          </Badge>
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            <Info className="w-3 h-3 mr-1" />
            Info
          </Badge>
        </div>
      </div>

      {/* Cards */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Card Styles</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="border border-border/50 hover:shadow-lg hover:border-primary/20 transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-base">Default Card</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Premium card with subtle border and smooth hover effects.
              </p>
            </CardContent>
          </Card>
          <Card className="border border-border/50 bg-gradient-to-br from-primary/5 via-card to-card/50 hover:shadow-lg hover:border-primary/30 transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-base">Elevated Card</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Card with subtle gradient and enhanced hover state.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Typography */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Typography</h3>
        <div className="space-y-4">
          <h1 className="text-4xl font-bold">Heading 1 - 4xl Bold</h1>
          <h2 className="text-2xl font-semibold">Heading 2 - 2xl Semibold</h2>
          <h3 className="text-lg font-semibold">Heading 3 - lg Semibold</h3>
          <p className="text-base">Body text - Regular 16px</p>
          <p className="text-sm text-muted-foreground">Small text - 14px Muted</p>
        </div>
      </div>
    </div>
  )
}
