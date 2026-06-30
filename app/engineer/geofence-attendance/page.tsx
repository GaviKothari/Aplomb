'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle2, Clock, MapPin, RefreshCw, AlertTriangle } from 'lucide-react'
import { calculateDistance, isWithinGeofence, formatDistance, getCurrentLocation, watchLocation } from '@/lib/geofence'
import { mockOfficeLocations } from '@/lib/mock-data'

export default function GeofenceAttendancePage() {
  const [currentTime, setCurrentTime]         = useState<string>('')
  const [userLocation, setUserLocation]       = useState<{ latitude: number; longitude: number } | null>(null)
  const [isCheckedIn, setIsCheckedIn]         = useState(false)
  const [distanceFromOffice, setDistanceFromOffice] = useState<number | null>(null)
  const [isWithinRadius, setIsWithinRadius]   = useState(false)
  const [loading, setLoading]                 = useState(true)
  const [error, setError]                     = useState<string | null>(null)
  const [recentPunches, setRecentPunches]     = useState([
    { id: 1, time: '09:15 AM', type: 'Punch In',    status: 'success' },
    { id: 2, time: '01:00 PM', type: 'Lunch Break', status: 'info' },
    { id: 3, time: '02:00 PM', type: 'Resume Work', status: 'success' },
  ])

  const primaryOffice = mockOfficeLocations[0]

  useEffect(() => {
    const id = setInterval(() => {
      const now = new Date()
      setCurrentTime(now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }, 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    setLoading(true)
    getCurrentLocation()
      .then(loc => {
        setUserLocation(loc)
        const dist = calculateDistance(loc.latitude, loc.longitude, primaryOffice.latitude, primaryOffice.longitude)
        setDistanceFromOffice(dist)
        setIsWithinRadius(isWithinGeofence(loc.latitude, loc.longitude, primaryOffice.latitude, primaryOffice.longitude, primaryOffice.radiusInMeters))
        setError(null)
      })
      .catch(err => setError(err.message || 'Unable to access location. Please enable GPS.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!userLocation) return
    const id = watchLocation(
      loc => {
        setUserLocation(loc)
        const dist = calculateDistance(loc.latitude, loc.longitude, primaryOffice.latitude, primaryOffice.longitude)
        setDistanceFromOffice(dist)
        setIsWithinRadius(isWithinGeofence(loc.latitude, loc.longitude, primaryOffice.latitude, primaryOffice.longitude, primaryOffice.radiusInMeters))
      },
      err => console.error('Location watch error:', err),
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [])

  const handlePunchIn = () => {
    if (!isWithinRadius) { alert('You must be within office premises to mark attendance'); return }
    setIsCheckedIn(true)
    setRecentPunches(p => [{ id: p.length + 1, time: currentTime, type: 'Punch In', status: 'success' }, ...p])
  }

  const handlePunchOut = () => {
    setIsCheckedIn(false)
    setRecentPunches(p => [{ id: p.length + 1, time: currentTime, type: 'Punch Out', status: 'success' }, ...p])
  }

  const handleRefreshLocation = async () => {
    setLoading(true)
    try {
      const loc = await getCurrentLocation()
      setUserLocation(loc)
      const dist = calculateDistance(loc.latitude, loc.longitude, primaryOffice.latitude, primaryOffice.longitude)
      setDistanceFromOffice(dist)
      setIsWithinRadius(isWithinGeofence(loc.latitude, loc.longitude, primaryOffice.latitude, primaryOffice.longitude, primaryOffice.radiusInMeters))
    } catch {
      setError('Failed to refresh location')
    } finally {
      setLoading(false)
    }
  }

  function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
      <div className="flex justify-between text-sm py-2 border-b border-gray-100 last:border-0">
        <span className="text-gray-500">{label}</span>
        <span className="font-medium text-gray-900">{value}</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 space-y-4">
      <div className="pt-2">
        <h1 className="text-2xl font-bold text-gray-900">Geofenced Attendance</h1>
        <p className="text-gray-500 text-sm mt-0.5">Mark attendance from {primaryOffice.name}</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-sm text-red-900">{error}</p>
            <Button variant="outline" size="sm" className="mt-2 border-red-200 text-red-700" onClick={handleRefreshLocation}>
              Try Again
            </Button>
          </div>
        </div>
      )}

      {/* Main card */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl shadow-sm px-4 py-8">
        <div className="text-center space-y-5">
          <div className="space-y-1">
            <p className="text-sm text-gray-500">Current Time</p>
            <p className="text-6xl font-bold tabular-nums font-mono text-gray-900">{currentTime}</p>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white shadow-sm border border-gray-200">
            {isCheckedIn ? (
              <><CheckCircle2 className="w-5 h-5 text-emerald-600" /><span className="font-medium text-gray-900">Checked In</span></>
            ) : (
              <><Clock className="w-5 h-5 text-amber-600" /><span className="font-medium text-gray-900">Not Checked In</span></>
            )}
          </div>

          <div className="p-4 rounded-xl bg-white border border-gray-200 space-y-1">
            {loading ? (
              <p className="text-sm text-gray-500">Checking your location…</p>
            ) : isWithinRadius ? (
              <div className="flex items-center gap-2 justify-center text-emerald-700">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-medium">Within office range</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 justify-center text-red-700">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">Outside office location</span>
              </div>
            )}
            {distanceFromOffice !== null && (
              <p className="text-xs text-gray-500 text-center">Distance from office: {formatDistance(distanceFromOffice)}</p>
            )}
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={handlePunchIn}
              disabled={!isWithinRadius || isCheckedIn}
              className="flex items-center gap-2 px-6 py-4 text-base font-semibold rounded-xl bg-emerald-600 active:bg-emerald-700 text-white disabled:opacity-50"
            >
              <CheckCircle2 className="w-5 h-5" /> Punch In
            </button>
            <button
              onClick={handlePunchOut}
              disabled={!isCheckedIn}
              className="flex items-center gap-2 px-6 py-4 text-base font-semibold rounded-xl bg-white border border-gray-200 text-gray-800 active:bg-gray-50 disabled:opacity-50"
            >
              <Clock className="w-5 h-5" /> Punch Out
            </button>
          </div>

          {!isWithinRadius && (
            <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200">
              <p className="text-sm text-red-700 font-medium">
                Must be within {primaryOffice.radiusInMeters}m of office premises
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Office & user location */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-gray-400" />
            <p className="text-sm font-semibold text-gray-900">Office</p>
          </div>
          <p className="text-xs font-medium text-gray-800">{primaryOffice.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">{primaryOffice.address}</p>
          <div className="mt-2 space-y-1">
            <p className="text-xs text-gray-500">Lat: <span className="font-mono text-gray-700">{primaryOffice.latitude.toFixed(4)}</span></p>
            <p className="text-xs text-gray-500">Lng: <span className="font-mono text-gray-700">{primaryOffice.longitude.toFixed(4)}</span></p>
            <p className="text-xs text-gray-500">Radius: {primaryOffice.radiusInMeters}m</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-gray-400" />
            <p className="text-sm font-semibold text-gray-900">Your Location</p>
          </div>
          {userLocation ? (
            <>
              <p className="text-xs text-gray-500">Lat: <span className="font-mono text-gray-700">{userLocation.latitude.toFixed(4)}</span></p>
              <p className="text-xs text-gray-500">Lng: <span className="font-mono text-gray-700">{userLocation.longitude.toFixed(4)}</span></p>
              {distanceFromOffice !== null && (
                <Badge className={`mt-2 text-xs ${isWithinRadius ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                  {formatDistance(distanceFromOffice)}
                </Badge>
              )}
              <button onClick={handleRefreshLocation} className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg py-1.5 active:bg-gray-50">
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
            </>
          ) : (
            <p className="text-xs text-gray-400">Loading location…</p>
          )}
        </div>
      </div>

      {/* Recent punches */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-900">Recent Punch Records</p>
        </div>
        <div className="p-4 space-y-2">
          {recentPunches.slice(0, 5).map(punch => (
            <div key={punch.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50">
              <div className="flex items-center gap-3">
                {punch.status === 'success'
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  : <Clock className="w-4 h-4 text-blue-600" />
                }
                <div>
                  <p className="font-medium text-sm text-gray-900">{punch.type}</p>
                  <p className="text-xs text-gray-400">{punch.time}</p>
                </div>
              </div>
              <Badge className={punch.status === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}>
                {punch.status}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
