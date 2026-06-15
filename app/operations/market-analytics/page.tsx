'use client'

import { useState, useMemo } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { TrendingUp, TrendingDown, Filter, RotateCcw, Download, MapPin, Home, Building2, Landmark } from 'lucide-react'
import { mockPropertyTransactions } from '@/lib/mock-data'

export default function MarketAnalyticsPage() {
  const [timeRange, setTimeRange] = useState<'monthly' | 'quarterly' | 'half-yearly' | 'yearly'>('monthly')
  const [selectedCity, setSelectedCity] = useState<string>('all')
  const [selectedPropertyType, setSelectedPropertyType] = useState<string>('all')
  const [searchAddress, setSearchAddress] = useState('')

  // Extract unique values
  const cities = ['all', ...new Set(mockPropertyTransactions.map((t) => t.city))]
  const propertyTypes = ['all', ...new Set(mockPropertyTransactions.map((t) => t.propertyType))]

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return mockPropertyTransactions.filter((t) => {
      if (selectedCity !== 'all' && t.city !== selectedCity) return false
      if (selectedPropertyType !== 'all' && t.propertyType !== selectedPropertyType) return false
      if (searchAddress && !t.address.toLowerCase().includes(searchAddress.toLowerCase())) return false
      return true
    })
  }, [selectedCity, selectedPropertyType, searchAddress])

  // Calculate metrics
  const metrics = useMemo(() => {
    if (filteredTransactions.length === 0) {
      return {
        total: 0,
        avgRate: 0,
        highest: 0,
        lowest: 0,
        change: 0,
      }
    }

    const total = filteredTransactions.length
    const avgRate = Math.round(
      filteredTransactions.reduce((sum, t) => sum + t.ratePerSqFt, 0) / total
    )
    const highest = Math.max(...filteredTransactions.map((t) => t.valuationAmount))
    const lowest = Math.min(...filteredTransactions.map((t) => t.valuationAmount))
    const change = 12 // Mock percentage change

    return { total, avgRate, highest, lowest, change }
  }, [filteredTransactions])

  // Group by location for bar chart data
  const locationData = useMemo(() => {
    const grouped: { [key: string]: { total: number; count: number } } = {}
    filteredTransactions.forEach((t) => {
      if (!grouped[t.area]) grouped[t.area] = { total: 0, count: 0 }
      grouped[t.area].total += t.ratePerSqFt
      grouped[t.area].count += 1
    })
    return Object.entries(grouped).map(([area, data]) => ({
      area,
      avgRate: Math.round(data.total / data.count),
    }))
  }, [filteredTransactions])

  // Group by property type
  const propertyTypeStats = useMemo(() => {
    const grouped: { [key: string]: number } = {}
    filteredTransactions.forEach((t) => {
      grouped[t.propertyType] = (grouped[t.propertyType] || 0) + 1
    })
    return Object.entries(grouped).map(([type, count]) => ({ type, count }))
  }, [filteredTransactions])

  const handleReset = () => {
    setTimeRange('monthly')
    setSelectedCity('all')
    setSelectedPropertyType('all')
    setSearchAddress('')
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Property Market Analytics</h1>
          <p className="text-muted-foreground mt-2">Comprehensive market insights, pricing trends, and transaction analysis</p>
        </div>

        {/* Filter Bar */}
        <Card className="sticky top-16 z-10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="w-4 h-4" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              {/* Time Range */}
              <div>
                <label className="text-sm font-medium block mb-2">Time Range</label>
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value as any)}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-950 text-sm"
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="half-yearly">Half-Yearly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              {/* City */}
              <div>
                <label className="text-sm font-medium block mb-2">City</label>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-950 text-sm"
                >
                  {cities.map((city) => (
                    <option key={city} value={city}>
                      {city === 'all' ? 'All Cities' : city}
                    </option>
                  ))}
                </select>
              </div>

              {/* Property Type */}
              <div>
                <label className="text-sm font-medium block mb-2">Property Type</label>
                <select
                  value={selectedPropertyType}
                  onChange={(e) => setSelectedPropertyType(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-950 text-sm"
                >
                  {propertyTypes.map((type) => (
                    <option key={type} value={type}>
                      {type === 'all' ? 'All Types' : type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search */}
              <div>
                <label className="text-sm font-medium block mb-2">Search Address</label>
                <Input
                  placeholder="Search address..."
                  value={searchAddress}
                  onChange={(e) => setSearchAddress(e.target.value)}
                  className="text-sm"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 items-end">
                <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground mb-1">Total Properties</p>
              <p className="text-2xl font-bold">{metrics.total}</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">Evaluated</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground mb-1">Avg Rate</p>
              <p className="text-2xl font-bold">₹{metrics.avgRate.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-2">per sq ft</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground mb-1">Highest Valuation</p>
              <p className="text-2xl font-bold">₹{(metrics.highest / 100000).toFixed(1)}L</p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">Max value</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground mb-1">Lowest Valuation</p>
              <p className="text-2xl font-bold">₹{(metrics.lowest / 100000).toFixed(1)}L</p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">Min value</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground mb-1">Trend</p>
              <div className="flex items-center gap-2 mt-1">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                <p className="text-2xl font-bold text-emerald-600">+{metrics.change}%</p>
              </div>
              <p className="text-xs text-muted-foreground mt-2">vs last period</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Location-wise Price Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>Location-wise Price Comparison</CardTitle>
              <CardDescription>Average rate per sq ft by area</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {locationData.map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium">{item.area}</span>
                      <span className="text-muted-foreground">₹{item.avgRate.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${Math.min((item.avgRate / metrics.avgRate) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Property Type Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Property Type Distribution</CardTitle>
              <CardDescription>Number of properties by type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {propertyTypeStats.map((item, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        {item.type === 'residential' && <Home className="w-4 h-4 text-blue-600" />}
                        {item.type === 'commercial' && <Building2 className="w-4 h-4 text-emerald-600" />}
                        {item.type === 'land' && <Landmark className="w-4 h-4 text-amber-600" />}
                        <span className="capitalize font-medium text-sm">{item.type}</span>
                      </div>
                      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                        {item.count} properties
                      </Badge>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div
                        className="bg-emerald-600 h-2 rounded-full"
                        style={{ width: `${(item.count / filteredTransactions.length) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transaction Table */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction Details</CardTitle>
            <CardDescription>All property transactions ({filteredTransactions.length} records)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold">Property Address</th>
                    <th className="text-left py-3 px-4 font-semibold">City</th>
                    <th className="text-left py-3 px-4 font-semibold">Type</th>
                    <th className="text-center py-3 px-4 font-semibold">Size (sq ft)</th>
                    <th className="text-right py-3 px-4 font-semibold">Valuation</th>
                    <th className="text-right py-3 px-4 font-semibold">Rate/sq ft</th>
                    <th className="text-left py-3 px-4 font-semibold">Bank</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((transaction) => (
                    <tr key={transaction.id} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-4 font-medium">{transaction.address}</td>
                      <td className="py-3 px-4">{transaction.city}</td>
                      <td className="py-3 px-4">
                        <Badge className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 capitalize">
                          {transaction.propertyType}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center text-muted-foreground">
                        {transaction.sizeInSqFt.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold">₹{(transaction.valuationAmount / 100000).toFixed(2)}L</td>
                      <td className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400 font-semibold">
                        ₹{transaction.ratePerSqFt.toLocaleString()}
                      </td>
                      <td className="py-3 px-4">{transaction.bank}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Insights Panel */}
        <Card className="border-l-4 border-l-blue-600 bg-blue-50 dark:bg-blue-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              Market Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <p className="font-medium text-sm">Key Findings:</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Commercial properties command {Math.round((metrics.avgRate * 1.5) / metrics.avgRate * 100 - 100)}% premium over residential in {selectedCity !== 'all' ? selectedCity : 'selected areas'}</li>
                <li>• Property rates increased by 12% compared to last quarter across major cities</li>
                <li>• {locationData[0]?.area} leads with highest average valuation rate</li>
                <li>• Total transaction volume: ₹{(filteredTransactions.reduce((sum, t) => sum + t.valuationAmount, 0) / 10000000).toFixed(1)} crore</li>
              </ul>
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
