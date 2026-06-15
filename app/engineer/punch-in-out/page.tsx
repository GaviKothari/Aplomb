'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, LogOut, LogIn, AlertTriangle } from 'lucide-react'
import { useTodayAttendance, usePunchIn, usePunchOut } from '@/lib/api/hooks'

export default function PunchInOutPage() {
  const [currentTime, setCurrentTime] = useState<string>('')
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [isGettingLocation, setIsGettingLocation] = useState(false)

  const { data: todayRecord, isLoading } = useTodayAttendance()
  const punchIn = usePunchIn()
  const punchOut = usePunchOut()

  const isPunchedIn = todayRecord?.punchIn && !todayRecord?.punchOut

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date()
      setCurrentTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    requestLocation()
  }, [])

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser')
      return
    }
    setIsGettingLocation(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude)
        setLongitude(position.coords.longitude)
        setLocationError(null)
        setIsGettingLocation(false)
      },
      (error) => {
        const msgs: Record<number, string> = {
          1: 'Location permission denied. Please enable location access.',
          2: 'Position unavailable. Check your GPS.',
          3: 'Location request timed out.',
        }
        setLocationError(msgs[error.code] ?? 'Unable to get location.')
        setIsGettingLocation(false)
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    )
  }

  const handlePunch = () => {
    if (!latitude || !longitude) {
      requestLocation()
      return
    }
    if (isPunchedIn) {
      punchOut.mutate({ lat: latitude, lng: longitude })
    } else {
      punchIn.mutate({ lat: latitude, lng: longitude })
    }
  }

  const isMutating = punchIn.isPending || punchOut.isPending

  const getTodayHours = () => {
    if (!todayRecord?.punchIn) return 0
    const start = new Date(todayRecord.punchIn).getTime()
    const end = todayRecord.punchOut ? new Date(todayRecord.punchOut).getTime() : Date.now()
    return (end - start) / 3_600_000
  }

  return (
    <div className="p-4 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Punch In/Out</h1>
          <p className="text-muted-foreground mt-2">Site Visit Check-in System</p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">GPS geofence verification</p>
        </div>

        {/* Clock */}
        <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
          <CardContent className="pt-8 pb-8 text-center space-y-2">
            <p className="text-muted-foreground text-sm">Current Time</p>
            <p className="text-6xl font-bold text-blue-900 dark:text-blue-300">{currentTime}</p>
            <p className="text-sm text-muted-foreground">{new Date().toDateString()}</p>
          </CardContent>
        </Card>

        {/* Location status */}
        {latitude && longitude && !locationError && (
          <Card className="border-l-4 border-l-emerald-500 bg-emerald-50 dark:bg-emerald-950/20">
            <CardContent className="pt-4 pb-4 flex gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-semibold">Location acquired</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {latitude.toFixed(4)}, {longitude.toFixed(4)}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {locationError && (
          <Card className="border-l-4 border-l-red-500 bg-red-50 dark:bg-red-950/20">
            <CardContent className="pt-4 pb-4 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-sm text-red-900 dark:text-red-300">Location Error</p>
                <p className="text-sm text-red-800 dark:text-red-400 mt-1">{locationError}</p>
                <Button size="sm" variant="outline" onClick={requestLocation} disabled={isGettingLocation} className="mt-3 text-xs">
                  {isGettingLocation ? 'Getting location…' : 'Retry'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status */}
        <Card className="border-l-4 border-l-green-500 bg-green-50 dark:bg-green-950/20">
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Current Status</p>
              <Badge className={isPunchedIn ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-200 text-slate-900'}>
                {isLoading ? 'Loading…' : isPunchedIn ? 'Working' : 'Not Working'}
              </Badge>
              {isPunchedIn && todayRecord?.punchIn && (
                <p className="text-xs text-muted-foreground mt-2">
                  Punched in at {new Date(todayRecord.punchIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-muted-foreground mb-2">Today's Hours</p>
              <p className="text-3xl font-bold">{getTodayHours().toFixed(1)}h</p>
            </div>
          </CardContent>
        </Card>

        {/* Action button */}
        {!isPunchedIn ? (
          <Button
            onClick={handlePunch}
            disabled={isMutating || isGettingLocation}
            size="lg"
            className="w-full h-24 text-2xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-3"
          >
            <LogIn className="w-8 h-8" />
            {isMutating ? 'Punching in…' : isGettingLocation ? 'Getting location…' : 'Punch In'}
          </Button>
        ) : (
          <Button
            onClick={handlePunch}
            disabled={isMutating || isGettingLocation}
            size="lg"
            className="w-full h-24 text-2xl font-bold bg-red-600 hover:bg-red-700 text-white gap-3"
          >
            <LogOut className="w-8 h-8" />
            {isMutating ? 'Punching out…' : 'Punch Out'}
          </Button>
        )}

        {/* Today's record */}
        {todayRecord && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Today's Record</CardTitle>
              <CardDescription>{new Date().toDateString()}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Punch In</span>
                <span className="font-mono font-semibold">
                  {todayRecord.punchIn
                    ? new Date(todayRecord.punchIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '—'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Punch Out</span>
                <span className="font-mono font-semibold">
                  {todayRecord.punchOut
                    ? new Date(todayRecord.punchOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '—'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Geofence</span>
                <Badge className={todayRecord.isWithinGeofence ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}>
                  {todayRecord.isWithinGeofence ? 'Within office' : 'Outside geofence'}
                </Badge>
              </div>
              {todayRecord.distanceFromOffice != null && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Distance from office</span>
                  <span className="font-semibold">{todayRecord.distanceFromOffice}m</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}
    </div>
  )
}
