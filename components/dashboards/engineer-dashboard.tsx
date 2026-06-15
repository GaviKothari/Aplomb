'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Briefcase, Clock, FileText, MapPin, Navigation, AlertCircle } from 'lucide-react'
import { StatCard } from '@/components/dashboard/stat-card'
import { mockCases } from '@/lib/mock-data'
import { Badge } from '@/components/ui/badge'

export function EngineerDashboard() {
  // Filter cases assigned to this engineer
  const assignedCases = mockCases.filter((c) => c.engineer === 'Rajesh Kumar')
  const todayCases = assignedCases.slice(0, 4)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Tasks</h1>
        <p className="text-muted-foreground mt-2">Assigned cases and travel tracking</p>
      </div>

      {/* Location & Status Alert */}
      <Card className="border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-950/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Navigation className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-medium text-sm">Current Location</p>
                <p className="text-xs text-muted-foreground">Bandra, Mumbai - 12:45 PM</p>
              </div>
            </div>
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Online</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Stats - Optimized for mobile/field work */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Cases Today"
          value={4}
          icon={Briefcase}
          color="bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300"
        />
        <StatCard
          label="Pending Visits"
          value={2}
          icon={Clock}
          color="bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300"
        />
        <StatCard
          label="Reports Submitted"
          value={12}
          icon={FileText}
          color="bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300"
        />
        <StatCard
          label="Travel Distance"
          value="47 km"
          icon={MapPin}
          color="bg-orange-50 text-orange-600 dark:bg-orange-950 dark:text-orange-300"
        />
      </div>

      {/* Today's priority cases */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Today's Priority Cases</span>
            <Badge variant="secondary">{todayCases.length}</Badge>
          </CardTitle>
          <CardDescription>Quick access to assigned visits</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {todayCases.map((caseItem, idx) => (
              <div
                key={caseItem.id}
                className="p-4 border rounded-lg hover:bg-muted/50 hover:border-primary/50 transition-all duration-200 group stagger-item animate-in fade-in slide-in-from-left-4"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{caseItem.propertyAddress}</p>
                    <p className="text-xs text-muted-foreground mt-1">{caseItem.bank}</p>
                  </div>
                  <Badge 
                    className={
                      caseItem.priority === 'high' 
                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300'
                    }
                  >
                    {caseItem.priority}
                  </Badge>
                </div>
                <div className="flex gap-2 pt-3 border-t">
                  <Button size="sm" className="flex-1 gap-2">
                    <MapPin className="w-4 h-4" />
                    Navigate
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1">
                    Start Visit
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button className="w-full" size="sm">
                Punch In
              </Button>
              <Button variant="outline" className="w-full" size="sm" disabled>
                Punch Out
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full justify-center" size="sm">
              AI Reporting Assistant
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-emerald-600" />
              Support
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full justify-center" size="sm">
              Get Help
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
