'use client'

import { useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useCase, useUpdateCaseStatus } from '@/lib/api/hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Phone, MapPin, Navigation, Camera, ArrowLeft,
  PlayCircle, CheckCircle2, Upload, AlertTriangle,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

const STATUS_COLOR: Record<string, string> = {
  NEW: 'bg-slate-100 text-slate-700',
  ASSIGNED: 'bg-blue-100 text-blue-800',
  SITE_VISIT_SCHEDULED: 'bg-amber-100 text-amber-800',
  SITE_VISIT_IN_PROGRESS: 'bg-purple-100 text-purple-800',
  SITE_VISIT_COMPLETED: 'bg-emerald-100 text-emerald-800',
  REVISION_REQUESTED: 'bg-red-100 text-red-800',
}

const STATUS_LABEL: Record<string, string> = {
  NEW: 'New',
  ASSIGNED: 'Assigned',
  SITE_VISIT_SCHEDULED: 'Visit Scheduled',
  SITE_VISIT_IN_PROGRESS: 'In Progress',
  SITE_VISIT_COMPLETED: 'Completed',
  REVISION_REQUESTED: 'Revision',
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex justify-between gap-3 py-2 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium text-right max-w-[55%]">{value}</span>
    </div>
  )
}

export default function EngineerCaseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data, isLoading } = useCase(id)
  const updateStatus = useUpdateCaseStatus()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [photos, setPhotos] = useState<File[]>([])
  const [gpsError, setGpsError] = useState<string | null>(null)
  const [gettingGps, setGettingGps] = useState(false)

  const c = data?.data ?? data

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    )
  }

  if (!c) {
    return (
      <div className="p-4 flex flex-col items-center gap-3 pt-20 text-center">
        <AlertTriangle className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Case not found</p>
        <Link href="/engineer/cases">
          <Button size="sm" variant="outline">Back to cases</Button>
        </Link>
      </div>
    )
  }

  const status = (c.status ?? '').toUpperCase()

  const getGPS = (): Promise<GeolocationCoordinates> => new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('Geolocation not supported')); return }
    setGettingGps(true)
    navigator.geolocation.getCurrentPosition(
      pos => { setGettingGps(false); resolve(pos.coords) },
      err => { setGettingGps(false); reject(err) },
      { enableHighAccuracy: true, timeout: 15000 },
    )
  })

  const handleStartVisit = async () => {
    try {
      await getGPS()
      updateStatus.mutate({ id, status: 'SITE_VISIT_IN_PROGRESS' })
    } catch {
      setGpsError('Enable GPS to start site visit')
    }
  }

  const handleEndVisit = async () => {
    try {
      await getGPS()
      updateStatus.mutate({ id, status: 'SITE_VISIT_COMPLETED' })
    } catch {
      setGpsError('Enable GPS to complete site visit')
    }
  }

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    setPhotos(prev => [...prev, ...files])
    toast.success(`${files.length} photo${files.length > 1 ? 's' : ''} selected`)
  }

  const ownerPhone = c.ownerPhone ?? c.owner?.phone
  const ownerName = c.ownerName ?? c.owner?.name ?? c.ownerDetails?.name
  const address = c.propertyAddress ?? c.address ?? c.propertyDetails?.address

  const mapsUrl = c.latitude && c.longitude
    ? `https://maps.google.com/?q=${c.latitude},${c.longitude}`
    : `https://maps.google.com/?q=${encodeURIComponent(address ?? '')}`

  return (
    <div className="p-4 space-y-4 pb-6">
      {/* Back + header */}
      <div className="flex items-center gap-3 pt-1">
        <button onClick={() => router.back()} className="p-1 -ml-1 rounded-md hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <h1 className="font-bold text-base truncate">{c.referenceNumber ?? id.slice(0, 8).toUpperCase()}</h1>
          <p className="text-xs text-muted-foreground">{c.bankName ?? c.bank}</p>
        </div>
        <Badge className={`ml-auto shrink-0 text-[10px] ${STATUS_COLOR[status] ?? 'bg-slate-100 text-slate-700'}`}>
          {STATUS_LABEL[status] ?? status}
        </Badge>
      </div>

      {/* Owner quick actions */}
      {(ownerPhone || address) && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground mb-3 font-medium">Quick Actions</p>
            <div className="flex gap-2">
              {ownerPhone && (
                <a href={`tel:${ownerPhone}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full gap-2 text-xs h-10">
                    <Phone className="h-4 w-4 text-emerald-600" />
                    Call Owner
                  </Button>
                </a>
              )}
              {address && (
                <a href={mapsUrl} target="_blank" rel="noreferrer" className="flex-1">
                  <Button variant="outline" size="sm" className="w-full gap-2 text-xs h-10">
                    <Navigation className="h-4 w-4 text-blue-600" />
                    Navigate
                  </Button>
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Property details */}
      <Card>
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-sm">Property Details</CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <InfoRow label="Address" value={address} />
          <InfoRow label="Owner" value={ownerName} />
          <InfoRow label="Owner Phone" value={ownerPhone} />
          <InfoRow label="Bank" value={c.bankName ?? c.bank} />
          <InfoRow label="Loan Reference" value={c.loanAccountNumber ?? c.loanRef} />
          <InfoRow label="Priority" value={c.priority} />
          <InfoRow label="Site Visit" value={c.siteVisitDate ? new Date(c.siteVisitDate).toLocaleDateString('en-IN') : null} />
          {c.notes && (
            <div className="mt-2 pt-2 border-t border-border/40">
              <p className="text-xs text-muted-foreground mb-1">Notes</p>
              <p className="text-xs">{c.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* GPS error */}
      {gpsError && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="pt-3 pb-3 flex gap-2 items-center">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <p className="text-xs text-amber-800 dark:text-amber-300">{gpsError}</p>
          </CardContent>
        </Card>
      )}

      {/* Site visit actions */}
      <Card>
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-sm">Site Visit</CardTitle>
        </CardHeader>
        <CardContent className="pb-4 space-y-3">
          {status === 'ASSIGNED' || status === 'SITE_VISIT_SCHEDULED' ? (
            <Button
              onClick={handleStartVisit}
              disabled={updateStatus.isPending || gettingGps}
              className="w-full gap-2 bg-purple-600 hover:bg-purple-700 text-white"
            >
              <PlayCircle className="h-4 w-4" />
              {gettingGps ? 'Getting GPS…' : updateStatus.isPending ? 'Starting…' : 'Start Site Visit'}
            </Button>
          ) : status === 'SITE_VISIT_IN_PROGRESS' ? (
            <Button
              onClick={handleEndVisit}
              disabled={updateStatus.isPending || gettingGps}
              className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CheckCircle2 className="h-4 w-4" />
              {gettingGps ? 'Getting GPS…' : updateStatus.isPending ? 'Saving…' : 'Complete Site Visit'}
            </Button>
          ) : status === 'SITE_VISIT_COMPLETED' ? (
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-sm">
              <CheckCircle2 className="h-4 w-4" />
              Site visit completed
            </div>
          ) : null}

          {/* Photo upload */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              className="hidden"
              onChange={handlePhotoSelect}
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="w-full gap-2 text-xs"
              size="sm"
            >
              <Camera className="h-4 w-4" />
              {photos.length > 0 ? `${photos.length} photo${photos.length > 1 ? 's' : ''} selected` : 'Take / Upload Photos'}
            </Button>

            {photos.length > 0 && (
              <div className="mt-2 grid grid-cols-4 gap-1.5">
                {photos.map((f, i) => (
                  <div key={i} className="aspect-square rounded-md overflow-hidden bg-muted">
                    <img
                      src={URL.createObjectURL(f)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}

            {photos.length > 0 && (
              <Button
                className="w-full mt-2 gap-2 text-xs"
                size="sm"
                onClick={() => toast.info('Photo upload coming soon')}
              >
                <Upload className="h-4 w-4" />
                Upload {photos.length} Photo{photos.length > 1 ? 's' : ''}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Map link */}
      {address && (
        <a href={mapsUrl} target="_blank" rel="noreferrer">
          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
            <CardContent className="pt-3 pb-3 flex items-center gap-3">
              <MapPin className="h-5 w-5 text-blue-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-blue-800 dark:text-blue-300">Open in Google Maps</p>
                <p className="text-[11px] text-blue-600 truncate">{address}</p>
              </div>
            </CardContent>
          </Card>
        </a>
      )}
    </div>
  )
}
