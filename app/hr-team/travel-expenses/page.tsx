'use client'

import { useState, useMemo } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { MapPin, TrendingUp, Download, Filter, RotateCcw, CheckCircle2, Clock, AlertCircle, DollarSign } from 'lucide-react'
import { mockTravelLogs, mockExpenseApprovals } from '@/lib/mock-data'

export default function TravelExpensesPage() {
  const [selectedEngineer, setSelectedEngineer] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Extract unique engineers and statuses
  const engineers = ['all', ...new Set(mockTravelLogs.map((t) => t.engineerName))]
  const statuses = ['all', 'pending', 'approved', 'paid', 'rejected']

  // Filter travel logs
  const filteredTravelLogs = useMemo(() => {
    return mockTravelLogs.filter((log) => {
      if (selectedEngineer !== 'all' && log.engineerName !== selectedEngineer) return false
      if (selectedStatus !== 'all' && log.status !== selectedStatus) return false
      if (dateFrom && log.date < dateFrom) return false
      if (dateTo && log.date > dateTo) return false
      return true
    })
  }, [selectedEngineer, selectedStatus, dateFrom, dateTo])

  // Calculate summary metrics
  const metrics = useMemo(() => {
    const totalDistance = filteredTravelLogs.reduce((sum, log) => sum + log.distanceKm, 0)
    const totalExpense = filteredTravelLogs.reduce((sum, log) => sum + log.totalExpense, 0)
    const pendingCount = filteredTravelLogs.filter((log) => log.status === 'pending').length
    const approvedCount = filteredTravelLogs.filter((log) => log.status === 'approved').length
    const pendingExpense = filteredTravelLogs
      .filter((log) => log.status === 'pending')
      .reduce((sum, log) => sum + log.totalExpense, 0)

    return { totalDistance, totalExpense, pendingCount, approvedCount, pendingExpense }
  }, [filteredTravelLogs])

  // Group by engineer for daily/monthly summary
  const engineerSummary = useMemo(() => {
    const grouped: { [key: string]: { distance: number; expense: number; trips: number } } = {}
    filteredTravelLogs.forEach((log) => {
      if (!grouped[log.engineerName]) {
        grouped[log.engineerName] = { distance: 0, expense: 0, trips: 0 }
      }
      grouped[log.engineerName].distance += log.distanceKm
      grouped[log.engineerName].expense += log.totalExpense
      grouped[log.engineerName].trips += 1
    })
    return Object.entries(grouped).map(([name, data]) => ({
      name,
      distance: Math.round(data.distance * 10) / 10,
      expense: data.expense,
      trips: data.trips,
      avgDistancePerTrip: Math.round((data.distance / data.trips) * 10) / 10,
    }))
  }, [filteredTravelLogs])

  const handleReset = () => {
    setSelectedEngineer('all')
    setSelectedStatus('all')
    setDateFrom('')
    setDateTo('')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300'
      case 'approved':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      case 'paid':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300'
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
    }
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Travel & Expenses Management</h1>
          <p className="text-muted-foreground mt-2">
            Track engineer travel distance, manage fuel reimbursements, and process expense approvals
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground mb-1">Total Distance</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold">{metrics.totalDistance.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">km</p>
              </div>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">{filteredTravelLogs.length} trips</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-blue-600" />
                <p className="text-xs text-muted-foreground">Total Expense</p>
              </div>
              <p className="text-2xl font-bold">₹{metrics.totalExpense.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-2">All statuses</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-amber-600" />
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
              <p className="text-2xl font-bold">{metrics.pendingCount}</p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">₹{metrics.pendingExpense.toLocaleString()}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <p className="text-xs text-muted-foreground">Approved</p>
              </div>
              <p className="text-2xl font-bold">{metrics.approvedCount}</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">Ready for payment</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <p className="text-xs text-muted-foreground">Avg Rate</p>
              </div>
              <p className="text-2xl font-bold">₹8/km</p>
              <p className="text-xs text-muted-foreground mt-2">Fixed fuel rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="w-4 h-4" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <div>
                <label className="text-sm font-medium block mb-2">Engineer</label>
                <select
                  value={selectedEngineer}
                  onChange={(e) => setSelectedEngineer(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-950 text-sm"
                >
                  {engineers.map((eng) => (
                    <option key={eng} value={eng}>
                      {eng === 'all' ? 'All Engineers' : eng}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-950 text-sm"
                >
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status === 'all' ? 'All Status' : status.charAt(0).toUpperCase() + status.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">From Date</label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="text-sm" />
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">To Date</label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="text-sm" />
              </div>

              <div className="flex gap-2 items-end">
                <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Travel Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle>Travel Logs</CardTitle>
            <CardDescription>Detailed travel and expense records ({filteredTravelLogs.length} entries)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold">Engineer</th>
                    <th className="text-left py-3 px-4 font-semibold">Case ID</th>
                    <th className="text-left py-3 px-4 font-semibold">Property Location</th>
                    <th className="text-center py-3 px-4 font-semibold">Distance (km)</th>
                    <th className="text-center py-3 px-4 font-semibold">Fuel Rate</th>
                    <th className="text-right py-3 px-4 font-semibold">Total Expense</th>
                    <th className="text-left py-3 px-4 font-semibold">Date</th>
                    <th className="text-left py-3 px-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTravelLogs.map((log) => (
                    <tr key={log.id} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-4 font-medium">{log.engineerName}</td>
                      <td className="py-3 px-4 text-muted-foreground">{log.caseId}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4 text-blue-600" />
                          <span className="text-xs">{log.propertyLocation}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center font-medium">{log.distanceKm}</td>
                      <td className="py-3 px-4 text-center">₹{log.fuelRatePerKm}/km</td>
                      <td className="py-3 px-4 text-right font-semibold">₹{log.totalExpense}</td>
                      <td className="py-3 px-4 text-muted-foreground text-xs">{log.date}</td>
                      <td className="py-3 px-4">
                        <Badge className={getStatusColor(log.status)}>
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

        {/* Engineer Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Engineer Summary</CardTitle>
            <CardDescription>Total distance and expenses per engineer</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {engineerSummary.map((summary, idx) => (
                <div key={idx} className="border rounded-lg p-4 space-y-3">
                  <div>
                    <p className="font-semibold text-sm mb-1">{summary.name}</p>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>Total Distance: <span className="font-semibold text-foreground">{summary.distance} km</span></p>
                      <p>Total Expense: <span className="font-semibold text-foreground">₹{summary.expense}</span></p>
                      <p>Trips: <span className="font-semibold text-foreground">{summary.trips}</span></p>
                      <p>Avg per Trip: <span className="font-semibold text-foreground">{summary.avgDistancePerTrip} km</span></p>
                    </div>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${Math.min((summary.distance / metrics.totalDistance) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Expense Approval Panel */}
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              Pending Approvals ({mockExpenseApprovals.filter((a) => a.status === 'pending').length})
            </CardTitle>
            <CardDescription>Expense reimbursements awaiting approval</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockExpenseApprovals.filter((a) => a.status === 'pending').map((approval) => (
                <div key={approval.id} className="border rounded-lg p-4 flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-semibold text-sm mb-2">{approval.engineerName}</p>
                    <div className="grid grid-cols-3 gap-4 text-xs">
                      <div>
                        <p className="text-muted-foreground">Total Distance</p>
                        <p className="font-semibold text-base">{approval.totalDistance} km</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total Expense</p>
                        <p className="font-semibold text-base">₹{approval.totalExpense}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Trips</p>
                        <p className="font-semibold text-base">{approval.travelLogIds.length}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button size="sm" className="gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      Approve
                    </Button>
                    <Button size="sm" variant="outline">
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Export Section */}
        <div className="flex gap-3 justify-end">
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export as PDF
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export as Excel
          </Button>
        </div>
      </div>
    </AppLayout>
  )
}
