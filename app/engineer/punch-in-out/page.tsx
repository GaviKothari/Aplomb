'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle2, LogOut, LogIn, AlertTriangle } from 'lucide-react'
import { useTodayAttendance, usePunchIn, usePunchOut } from '@/lib/api/hooks'

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between text-sm py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold text-gray-900">{value}</span>
    </div>
  )
}

export default function PunchInOutPage() {
  const [currentTime, setCurrentTime] = useState<string>('')
  const [latitude, setLatitude]       = useState<number | null>(null)
  const [longitude, setLongitude]     = useState<number | null>(null)
  const [locationError, setLocationError]   = useState<string | null>(null)
  const [isGettingLocation, setIsGettingLocation] = useState(false)

  const { data: todayRecord, isLoading } = useTodayAttendance()
  const punchIn  = usePunchIn()
  const punchOut = usePunchOut()

  const isPunchedIn = todayRecord?.punchIn && !todayRecord?.punchOut

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date()
      setCurrentTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => { requestLocation() }, [])

  const requestLocation = () => {
    if (!navigator.geolocation) { setLocationError('Geolocation not supported'); return }
    setIsGettingLocation(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLatitude(pos.coords.latitude)
        setLongitude(pos.coords.longitude)
        setLocationError(null)
        setIsGettingLocation(false)
      },
      err => {
        const msgs: Record<number, string> = {
          1: 'Location permission denied. Please enable location access.',
          2: 'Position unavailable. Check your GPS.',
          3: 'Location request timed out.',
        }
        setLocationError(msgs[err.code] ?? 'Unable to get location.')
        setIsGettingLocation(false)
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    )
  }

  const handlePunch = () => {
    if (!latitude || !longitude) { requestLocation(); return }
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
    const end   = todayRecord.punchOut ? new Date(todayRecord.punchOut).getTime() : Date.now()
    return (end - start) / 3_600_000
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 space-y-4">
      <div className="pt-2">
        <h1 className="text-2xl font-bold text-gray-900">Punch In / Out</h1>
        <p className="text-gray-500 text-sm mt-0.5">GPS-verified site check-in</p>
      </div>

      {/* Clock */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl py-8 text-center space-y-1 shadow-sm">
        <p className="text-gray-500 text-sm">Current Time</p>
        <p className="text-6xl font-bold text-blue-900 tabular-nums">{currentTime}</p>
        <p className="text-sm text-gray-500">{new Date().toDateString()}</p>
      </div>

      {/* Location status */}
      {latitude && longitude && !locationError && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 flex gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-emerald-900">Location acquired</p>
            <p className="text-xs text-emerald-700 mt-0.5">{latitude.toFixed(4)}, {longitude.toFixed(4)}</p>
          </div>
        </div>
      )}

      {locationError && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-sm text-red-900">Location Error</p>
            <p className="text-sm text-red-700 mt-1">{locationError}</p>
            <Button size="sm" variant="outline" onClick={requestLocation} disabled={isGettingLocation} className="mt-2 text-xs border-red-200 text-red-700 hover:bg-red-50">
              {isGettingLocation ? 'Getting location…' : 'Retry'}
            </Button>
          </div>
        </div>
      )}

      {/* Status summary */}
      <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 mb-1">Current Status</p>
          <Badge className={isPunchedIn ? 'bg-emerald-100 text-emerald-900' : 'bg-gray-100 text-gray-700'}>
            {isLoading ? 'Loading…' : isPunchedIn ? 'Working' : 'Not Working'}
          </Badge>
          {isPunchedIn && todayRecord?.punchIn && (
            <p className="text-xs text-gray-500 mt-1.5">
              Punched in at {new Date(todayRecord.punchIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 mb-1">Today's Hours</p>
          <p className="text-3xl font-bold text-gray-900">{getTodayHours().toFixed(1)}h</p>
        </div>
      </div>

      {/* Action button */}
      {!isPunchedIn ? (
        <button
          onClick={handlePunch}
          disabled={isMutating || isGettingLocation}
          className="w-full h-24 rounded-2xl text-2xl font-bold bg-emerald-600 active:bg-emerald-700 text-white flex items-center justify-center gap-3 disabled:opacity-60"
        >
          <LogIn className="w-8 h-8" />
          {isMutating ? 'Punching in…' : isGettingLocation ? 'Getting location…' : 'Punch In'}
        </button>
      ) : (
        <button
          onClick={handlePunch}
          disabled={isMutating || isGettingLocation}
          className="w-full h-24 rounded-2xl text-2xl font-bold bg-red-600 active:bg-red-700 text-white flex items-center justify-center gap-3 disabled:opacity-60"
        >
          <LogOut className="w-8 h-8" />
          {isMutating ? 'Punching out…' : 'Punch Out'}
        </button>
      )}

      {/* Today's record */}
      {todayRecord && (
        <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Today's Record</p>
          <Row label="Punch In"  value={todayRecord.punchIn  ? new Date(todayRecord.punchIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'} />
          <Row label="Punch Out" value={todayRecord.punchOut ? new Date(todayRecord.punchOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'} />
          <Row label="Geofence"  value={
            <Badge className={todayRecord.isWithinGeofence ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}>
              {todayRecord.isWithinGeofence ? 'Within office' : 'Outside geofence'}
            </Badge>
          } />
          {todayRecord.distanceFromOffice != null && (
            <Row label="Distance from office" value={`${todayRecord.distanceFromOffice}m`} />
          )}
        </div>
      )}
    </div>
  )
}
