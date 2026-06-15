'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin, Navigation, Calendar, TrendingUp, AlertCircle } from 'lucide-react'
import { mockTravelLogs } from '@/lib/mock-data'

export default function EngineerTravelViewPage() {
  // Mock current engineer
  const currentEngineerId = 'ENG-001'
  const currentEngineerName = 'Raj Kumar'

  // Get today's date
  const today = new Date().toISOString().split('T')[0]

  // Filter today's travel logs for current engineer
  const todayTravelLogs = useMemo(() => {
    return mockTravelLogs.filter((log) => log.engineerId === currentEngineerId && log.date === today)
  }, [])

  // Filter this month's travel logs for current engineer
  const thisMonthTravelLogs = useMemo(() => {
    const currentDate = new Date()
    const monthStart = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`

    return mockTravelLogs.filter((log) => log.engineerId === currentEngineerId && log.date.startsWith(monthStart))
  }, [])

  // Calculate today's metrics
  const todayMetrics = useMemo(() => {
    const totalDistance = todayTravelLogs.reduce((sum, log) => sum + log.distanceKm, 0)
    const totalEarnings = todayTravelLogs.reduce((sum, log) => sum + log.totalExpense, 0)
    const trips = todayTravelLogs.length

    return { totalDistance, totalEarnings, trips }
  }, [todayTravelLogs])

  // Calculate month's metrics
  const monthMetrics = useMemo(() => {
    const totalDistance = thisMonthTravelLogs.reduce((sum, log) => sum + log.distanceKm, 0)
    const totalEarnings = thisMonthTravelLogs.reduce((sum, log) => sum + log.totalExpense, 0)
    const pendingCount = thisMonthTravelLogs.filter((log) => log.status === 'pending').length
    const approvedCount = thisMonthTravelLogs.filter((log) => log.status === 'approved').length
    const paidCount = thisMonthTravelLogs.filter((log) => log.status === 'paid').length

    return { totalDistance, totalEarnings, pendingCount, approvedCount, paidCount }
  }, [thisMonthTravelLogs])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300'
      case 'approved':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      case 'paid':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300'
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
    }
  }

  return (
    <div className="p-4 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Travel & Expenses</h1>
          <p className="text-muted-foreground mt-2">Track your daily travel, earnings, and reimbursement status</p>
        </div>

        {/* TODAY'S SUMMARY */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Today's Summary
          </h2>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/10 border-l-4 border-l-blue-600">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-3">
                  <Navigation className="w-5 h-5 text-blue-600" />
                  <p className="text-sm text-muted-foreground">Distance Travelled</p>
                </div>
                <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">{todayMetrics.totalDistance}</p>
                <p className="text-xs text-muted-foreground mt-2">km</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/20 dark:to-emerald-900/10 border-l-4 border-l-emerald-600">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-3">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  <p className="text-sm text-muted-foreground">Today's Earnings</p>
                </div>
                <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">₹{todayMetrics.totalEarnings}</p>
                <p className="text-xs text-muted-foreground mt-2">{todayMetrics.trips} trips</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/20 dark:to-purple-900/10 border-l-4 border-l-purple-600">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-3">
                  <MapPin className="w-5 h-5 text-purple-600" />
                  <p className="text-sm text-muted-foreground">Rate per km</p>
                </div>
                <p className="text-3xl font-bold text-purple-700 dark:text-purple-300">₹8</p>
                <p className="text-xs text-muted-foreground mt-2">Fixed rate</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* TODAY'S TRAVEL LOGS */}
        {todayTravelLogs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Today's Trips</CardTitle>
              <CardDescription>Trip details and reimbursement status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {todayTravelLogs.map((log) => (
                  <div key={log.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-semibold text-sm">{log.propertyLocation}</p>
                        <p className="text-xs text-muted-foreground">{log.caseId}</p>
                      </div>
                      <Badge className={getStatusColor(log.status)}>
                        {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-xs mb-3">
                      <div>
                        <p className="text-muted-foreground">Distance</p>
                        <p className="font-semibold text-foreground">{log.distanceKm} km</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Rate</p>
                        <p className="font-semibold text-foreground">₹{log.fuelRatePerKm}/km</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Amount</p>
                        <p className="font-semibold text-emerald-600 dark:text-emerald-400">₹{log.totalExpense}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {todayTravelLogs.length === 0 && (
          <Card className="border-l-4 border-l-slate-400 bg-slate-50 dark:bg-slate-950/20">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground text-center py-8">No trips recorded today</p>
            </CardContent>
          </Card>
        )}

        {/* THIS MONTH'S SUMMARY */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            This Month's Summary
          </h2>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground mb-1">Total Distance</p>
                <p className="text-2xl font-bold">{monthMetrics.totalDistance}</p>
                <p className="text-xs text-muted-foreground mt-2">km</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground mb-1">Total Earnings</p>
                <p className="text-2xl font-bold">₹{monthMetrics.totalEarnings}</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">This month</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground mb-1">Pending</p>
                <p className="text-2xl font-bold text-amber-600">{monthMetrics.pendingCount}</p>
                <p className="text-xs text-muted-foreground mt-2">Trips</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground mb-1">Approved</p>
                <p className="text-2xl font-bold text-blue-600">{monthMetrics.approvedCount}</p>
                <p className="text-xs text-muted-foreground mt-2">Awaiting payment</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground mb-1">Paid</p>
                <p className="text-2xl font-bold text-emerald-600">{monthMetrics.paidCount}</p>
                <p className="text-xs text-muted-foreground mt-2">Completed</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* THIS MONTH'S ALL TRIPS */}
        {thisMonthTravelLogs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>This Month's Trips</CardTitle>
              <CardDescription>All travel records and reimbursement history ({thisMonthTravelLogs.length} trips)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold">Property</th>
                      <th className="text-center py-3 px-4 font-semibold">Distance</th>
                      <th className="text-center py-3 px-4 font-semibold">Rate</th>
                      <th className="text-right py-3 px-4 font-semibold">Amount</th>
                      <th className="text-left py-3 px-4 font-semibold">Date</th>
                      <th className="text-left py-3 px-4 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {thisMonthTravelLogs.map((log) => (
                      <tr key={log.id} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="py-3 px-4 font-medium text-xs">{log.propertyLocation}</td>
                        <td className="py-3 px-4 text-center">{log.distanceKm} km</td>
                        <td className="py-3 px-4 text-center">₹{log.fuelRatePerKm}</td>
                        <td className="py-3 px-4 text-right font-semibold">₹{log.totalExpense}</td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">{log.date}</td>
                        <td className="py-3 px-4">
                          <Badge className={getStatusColor(log.status)} variant="outline">
                            {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* INFO CARD */}
        <Card className="border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="w-4 h-4 text-blue-600" />
              How It Works
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>• Your travel distance is automatically calculated using GPS location</p>
            <p>• Reimbursement is computed at ₹8 per kilometer</p>
            <p>• Expenses are submitted monthly for approval</p>
            <p>• Approved expenses are transferred to your bank account</p>
          </CardContent>
        </Card>
    </div>
  )
}
