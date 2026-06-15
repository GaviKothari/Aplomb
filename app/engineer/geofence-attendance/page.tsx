'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle2, Clock, MapPin, RefreshCw, AlertTriangle } from 'lucide-react'
import { calculateDistance, isWithinGeofence, formatDistance, getCurrentLocation, watchLocation } from '@/lib/geofence'
import { mockOfficeLocations, mockEmployees } from '@/lib/mock-data'

export default function GeofenceAttendancePage() {
  const [currentTime, setCurrentTime] = useState<string>('')
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const [isCheckedIn, setIsCheckedIn] = useState(false)
  const [distanceFromOffice, setDistanceFromOffice] = useState<number | null>(null)
  const [isWithinRadius, setIsWithinRadius] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [recentPunches, setRecentPunches] = useState([
    { id: 1, time: '09:15 AM', type: 'Punch In', status: 'success' },
    { id: 2, time: '01:00 PM', type: 'Lunch Break', status: 'info' },
    { id: 3, time: '02:00 PM', type: 'Resume Work', status: 'success' },
  ])

  const primaryOffice = mockOfficeLocations[0]
  const currentEmployee = mockEmployees[0]

  // Update current time
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  // Get initial location
  useEffect(() => {
    setLoading(true)
    getCurrentLocation()
      .then((location) => {
        setUserLocation(location)
        const distance = calculateDistance(
          location.latitude,
          location.longitude,
          primaryOffice.latitude,
          primaryOffice.longitude
        )
        setDistanceFromOffice(distance)
        setIsWithinRadius(isWithinGeofence(location.latitude, location.longitude, primaryOffice.latitude, primaryOffice.longitude, primaryOffice.radiusInMeters))
        setError(null)
      })
      .catch((err) => {
        setError(err.message || 'Unable to access location. Please enable GPS and refresh.')
      })
      .finally(() => setLoading(false))
  }, [])

  // Watch location continuously
  useEffect(() => {
    if (!userLocation) return

    const watchId = watchLocation(
      (location) => {
        setUserLocation(location)
        const distance = calculateDistance(
          location.latitude,
          location.longitude,
          primaryOffice.latitude,
          primaryOffice.longitude
        )
        setDistanceFromOffice(distance)
        setIsWithinRadius(isWithinGeofence(location.latitude, location.longitude, primaryOffice.latitude, primaryOffice.longitude, primaryOffice.radiusInMeters))
      },
      (err) => console.error('Location watch error:', err)
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [])

  const handlePunchIn = () => {
    if (!isWithinRadius) {
      alert('You must be within office premises to mark attendance')
      return
    }
    setIsCheckedIn(true)
    setRecentPunches([
      { id: recentPunches.length + 1, time: currentTime, type: 'Punch In', status: 'success' },
      ...recentPunches,
    ])
  }

  const handlePunchOut = () => {
    setIsCheckedIn(false)
    setRecentPunches([
      { id: recentPunches.length + 1, time: currentTime, type: 'Punch Out', status: 'success' },
      ...recentPunches,
    ])
  }

  const handleRefreshLocation = async () => {
    setLoading(true)
    try {
      const location = await getCurrentLocation()
      setUserLocation(location)
      const distance = calculateDistance(
        location.latitude,
        location.longitude,
        primaryOffice.latitude,
        primaryOffice.longitude
      )
      setDistanceFromOffice(distance)
      setIsWithinRadius(isWithinGeofence(location.latitude, location.longitude, primaryOffice.latitude, primaryOffice.longitude, primaryOffice.radiusInMeters))
    } catch (err) {
      setError('Failed to refresh location')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Geofenced Attendance</h1>
          <p className="text-muted-foreground mt-2">Mark attendance from {primaryOffice.name}</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm text-red-900 dark:text-red-300">{error}</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={handleRefreshLocation}>
                Try Again
              </Button>
            </div>
          </div>
        )}

        {/* Main Attendance Card */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
          <CardContent className="pt-8">
            <div className="text-center space-y-6">
              {/* Clock */}
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Current Time</p>
                <p className="text-6xl font-bold tabular-nums font-mono">{currentTime}</p>
              </div>

              {/* Status */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-slate-900 shadow-sm">
                {isCheckedIn ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span className="font-medium">Checked In</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-5 h-5 text-amber-600" />
                    <span className="font-medium">Not Checked In</span>
                  </>
                )}
              </div>

              {/* Location Status */}
              <div className="p-4 rounded-lg bg-white dark:bg-slate-900 space-y-2">
                {loading ? (
                  <p className="text-sm text-muted-foreground">Checking your location...</p>
                ) : isWithinRadius ? (
                  <div className="flex items-center gap-2 justify-center text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-medium">You are within office range</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 justify-center text-red-700 dark:text-red-400">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-medium">You are outside office location</span>
                  </div>
                )}
                {distanceFromOffice !== null && (
                  <p className="text-xs text-muted-foreground text-center">
                    Distance from office: {formatDistance(distanceFromOffice)}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 justify-center">
                <Button
                  size="lg"
                  className="gap-3 px-8 py-6 text-lg"
                  onClick={handlePunchIn}
                  disabled={!isWithinRadius || isCheckedIn}
                >
                  <CheckCircle2 className="w-6 h-6" />
                  Punch In
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="gap-3 px-8 py-6 text-lg"
                  onClick={handlePunchOut}
                  disabled={!isCheckedIn}
                >
                  <Clock className="w-6 h-6" />
                  Punch Out
                </Button>
              </div>

              {!isWithinRadius && (
                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-700 dark:text-red-400 font-medium">
                    You must be within {primaryOffice.radiusInMeters}m of office premises to mark attendance
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Office Info & Map Preview */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Office Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="font-medium">{primaryOffice.name}</p>
                <p className="text-muted-foreground">{primaryOffice.address}</p>
              </div>
              <div className="grid gap-2">
                <div className="flex gap-2">
                  <span className="font-medium">Latitude:</span>
                  <span className="text-muted-foreground font-mono">{primaryOffice.latitude.toFixed(4)}</span>
                </div>
                <div className="flex gap-2">
                  <span className="font-medium">Longitude:</span>
                  <span className="text-muted-foreground font-mono">{primaryOffice.longitude.toFixed(4)}</span>
                </div>
                <div className="flex gap-2">
                  <span className="font-medium">Allowed Radius:</span>
                  <span className="text-muted-foreground">{primaryOffice.radiusInMeters}m</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Your Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {userLocation ? (
                <>
                  <div className="grid gap-2">
                    <div className="flex gap-2">
                      <span className="font-medium">Latitude:</span>
                      <span className="text-muted-foreground font-mono">{userLocation.latitude.toFixed(4)}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-medium">Longitude:</span>
                      <span className="text-muted-foreground font-mono">{userLocation.longitude.toFixed(4)}</span>
                    </div>
                    {distanceFromOffice !== null && (
                      <div className="flex gap-2">
                        <span className="font-medium">Distance to Office:</span>
                        <Badge className={isWithinRadius ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}>
                          {formatDistance(distanceFromOffice)}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <Button variant="outline" size="sm" onClick={handleRefreshLocation} className="gap-2 w-full">
                    <RefreshCw className="w-4 h-4" />
                    Refresh Location
                  </Button>
                </>
              ) : (
                <p className="text-muted-foreground">Loading your location...</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Punches */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Punch Records</CardTitle>
            <CardDescription>Last 5 punch in/out entries</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentPunches.slice(0, 5).map((punch) => (
                <div key={punch.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    {punch.status === 'success' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <Clock className="w-5 h-5 text-blue-600" />
                    )}
                    <div>
                      <p className="font-medium text-sm">{punch.type}</p>
                      <p className="text-xs text-muted-foreground">{punch.time}</p>
                    </div>
                  </div>
                  <Badge className={punch.status === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}>
                    {punch.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
    </div>
  )
}
