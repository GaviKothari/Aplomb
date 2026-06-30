'use client'

import { useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useCase, useUpdateCaseStatus, useUploadCasePhotos } from '@/lib/api/hooks'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Phone, MapPin, Navigation, Camera, ArrowLeft,
  PlayCircle, CheckCircle2, Upload, AlertTriangle,
  Loader2, Bot,
} from 'lucide-react'
import Link from 'next/link'

const STATUS_COLOR: Record<string, string> = {
  NEW:                    'bg-slate-100 text-slate-700',
  ASSIGNED:               'bg-blue-100 text-blue-800',
  SITE_VISIT_SCHEDULED:   'bg-amber-100 text-amber-800',
  SITE_VISIT_IN_PROGRESS: 'bg-purple-100 text-purple-800',
  SITE_VISIT_COMPLETED:   'bg-emerald-100 text-emerald-800',
  REVISION_REQUESTED:     'bg-red-100 text-red-800',
}

const STATUS_LABEL: Record<string, string> = {
  NEW:                    'New',
  ASSIGNED:               'Assigned',
  SITE_VISIT_SCHEDULED:   'Visit Scheduled',
  SITE_VISIT_IN_PROGRESS: 'In Progress',
  SITE_VISIT_COMPLETED:   'Completed',
  REVISION_REQUESTED:     'Revision',
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex justify-between gap-3 py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-xs font-semibold text-gray-900 text-right max-w-[58%]">{value}</span>
    </div>
  )
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm ${className}`}>
      {children}
    </div>
  )
}

export default function EngineerCaseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data, isLoading } = useCase(id)
  const updateStatus = useUpdateCaseStatus()
  const uploadPhotos = useUploadCasePhotos()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [photos, setPhotos] = useState<File[]>([])
  const [gpsError, setGpsError] = useState<string | null>(null)
  const [gettingGps, setGettingGps] = useState(false)
  const [uploading, setUploading] = useState(false)

  const c = data?.data ?? data

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
      const coords = await getGPS()
      updateStatus.mutate({ id, status: 'SITE_VISIT_IN_PROGRESS', lat: coords.latitude, lng: coords.longitude } as any)
    } catch {
      setGpsError('Enable GPS to start site visit')
    }
  }

  const handleEndVisit = async () => {
    try {
      const coords = await getGPS()
      updateStatus.mutate({ id, status: 'SITE_VISIT_COMPLETED', lat: coords.latitude, lng: coords.longitude } as any)
    } catch {
      setGpsError('Enable GPS to complete site visit')
    }
  }

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotos(prev => [...prev, ...Array.from(e.target.files ?? [])])
    e.target.value = ''
  }

  const handlePhotoUpload = async () => {
    if (photos.length === 0) return
    setUploading(true)
    try {
      await uploadPhotos.mutateAsync({ id, files: photos })
      setPhotos([])
    } catch {
      // toast shown by mutation onError
    } finally {
      setUploading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="bg-gray-50 min-h-screen p-4 space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-44 w-full rounded-2xl" />
      </div>
    )
  }

  if (!c) {
    return (
      <div className="bg-white min-h-screen p-4 flex flex-col items-center gap-3 pt-20 text-center">
        <AlertTriangle className="h-10 w-10 text-gray-300" />
        <p className="text-sm text-gray-500">Case not found</p>
        <Link href="/engineer/cases">
          <Button size="sm" variant="outline">Back to cases</Button>
        </Link>
      </div>
    )
  }

  const status     = (c.status ?? '').toUpperCase()
  const ownerPhone = c.ownerContact ?? c.ownerPhone
  const address    = c.propertyAddress
  const mapsUrl    = c.latitude && c.longitude
    ? `https://maps.google.com/?q=${c.latitude},${c.longitude}`
    : `https://maps.google.com/?q=${encodeURIComponent(address ?? '')}`

  return (
    <div className="bg-gray-50 min-h-screen pb-8">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1 -ml-1 text-gray-600 active:opacity-60">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="font-bold text-base text-gray-900 truncate">{c.caseNumber ?? id.slice(0, 8).toUpperCase()}</h1>
          <p className="text-xs text-gray-500">{c.organization?.name}</p>
        </div>
        <Badge className={`shrink-0 text-[10px] ${STATUS_COLOR[status] ?? 'bg-slate-100 text-slate-700'}`}>
          {STATUS_LABEL[status] ?? status}
        </Badge>
      </div>

      <div className="p-4 space-y-3">
        {/* Quick actions */}
        {(ownerPhone || address) && (
          <div className="flex gap-2">
            {ownerPhone && (
              <a href={`tel:${ownerPhone}`} className="flex-1">
                <button className="w-full flex items-center justify-center gap-2 bg-white border border-gray-200 rounded-2xl py-3 text-sm font-medium text-gray-800 shadow-sm active:bg-gray-50">
                  <Phone className="h-4 w-4 text-emerald-600" /> Call Owner
                </button>
              </a>
            )}
            <a href={mapsUrl} target="_blank" rel="noreferrer" className="flex-1">
              <button className="w-full flex items-center justify-center gap-2 bg-white border border-gray-200 rounded-2xl py-3 text-sm font-medium text-gray-800 shadow-sm active:bg-gray-50">
                <Navigation className="h-4 w-4 text-blue-600" /> Navigate
              </button>
            </a>
          </div>
        )}

        {/* GPS error */}
        {gpsError && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex gap-2 items-center">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <p className="text-xs text-amber-800">{gpsError}</p>
          </div>
        )}

        {/* Site visit actions */}
        <Card className="p-4 space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Site Visit</p>

          {(status === 'ASSIGNED' || status === 'SITE_VISIT_SCHEDULED') && (
            <button
              onClick={handleStartVisit}
              disabled={updateStatus.isPending || gettingGps}
              className="w-full flex items-center justify-center gap-2 bg-purple-600 active:bg-purple-700 text-white rounded-xl py-3.5 text-sm font-semibold disabled:opacity-60"
            >
              <PlayCircle className="h-5 w-5" />
              {gettingGps ? 'Getting GPS…' : updateStatus.isPending ? 'Starting…' : 'Start Site Visit'}
            </button>
          )}

          {status === 'SITE_VISIT_IN_PROGRESS' && (
            <>
              <Link href={`/engineer/cases/${id}/inspect`} className="block">
                <button className="w-full flex items-center justify-center gap-2 bg-[#075E54] active:bg-[#064d45] text-white rounded-xl py-3.5 text-sm font-semibold">
                  <Bot className="h-5 w-5" />
                  Start AI Inspection
                </button>
              </Link>
              <button
                onClick={handleEndVisit}
                disabled={updateStatus.isPending || gettingGps}
                className="w-full flex items-center justify-center gap-2 bg-white border border-gray-200 rounded-xl py-3 text-sm font-medium text-gray-700 active:bg-gray-50 disabled:opacity-60"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                {gettingGps ? 'Getting GPS…' : updateStatus.isPending ? 'Saving…' : 'Complete Site Visit'}
              </button>
            </>
          )}

          {status === 'SITE_VISIT_COMPLETED' && (
            <div className="flex items-center gap-2 text-emerald-700 text-sm py-1">
              <CheckCircle2 className="h-4 w-4" />
              Site visit completed
            </div>
          )}
        </Card>

        {/* Property details */}
        <Card className="px-4 py-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Property Details</p>
          <InfoRow label="Address"    value={address} />
          <InfoRow label="Owner"      value={c.ownerName} />
          <InfoRow label="Phone"      value={ownerPhone} />
          <InfoRow label="Bank"       value={c.organization?.name} />
          <InfoRow label="Loan Ref"   value={c.loanAccountNumber} />
          <InfoRow label="Branch"     value={c.branchName} />
          <InfoRow label="Priority"   value={c.priority} />
          <InfoRow label="Site Visit" value={c.siteVisitDate ? new Date(c.siteVisitDate).toLocaleDateString('en-IN') : null} />
          {c.notes && (
            <div className="mt-2 pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Notes from office</p>
              <p className="text-xs text-gray-800">{c.notes}</p>
            </div>
          )}
        </Card>

        {/* Photos */}
        <Card className="p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Site Photos</p>
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoSelect} />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 border border-dashed border-gray-300 rounded-xl py-3 text-sm text-gray-600 active:bg-gray-50"
          >
            <Camera className="h-4 w-4 text-gray-500" />
            {photos.length > 0 ? `${photos.length} photo${photos.length > 1 ? 's' : ''} selected` : 'Take / Select Photos'}
          </button>

          {photos.length > 0 && (
            <>
              <div className="grid grid-cols-4 gap-1.5">
                {photos.map((f, i) => (
                  <div key={i} className="aspect-square rounded-xl overflow-hidden bg-gray-100 relative">
                    <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setPhotos(p => p.filter((_, j) => j !== i))}
                      className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full w-4 h-4 text-[10px] leading-none flex items-center justify-center"
                    >✕</button>
                  </div>
                ))}
              </div>
              <button
                onClick={handlePhotoUpload}
                disabled={uploading}
                className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white rounded-xl py-3 text-sm font-medium active:bg-gray-800 disabled:opacity-60"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? 'Uploading…' : `Upload ${photos.length} Photo${photos.length > 1 ? 's' : ''}`}
              </button>
            </>
          )}

          {c.media && c.media.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-2">Uploaded ({c.media.length})</p>
              <div className="grid grid-cols-4 gap-1.5">
                {c.media.slice(0, 12).map((m: any) => (
                  <div key={m.id} className="aspect-square rounded-xl overflow-hidden bg-gray-100">
                    <img src={m.cdnUrl ?? m.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Map link */}
        {address && (
          <a href={mapsUrl} target="_blank" rel="noreferrer">
            <div className="bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3 flex items-center gap-3">
              <MapPin className="h-5 w-5 text-blue-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-blue-800">Open in Google Maps</p>
                <p className="text-[11px] text-blue-600 truncate">{address}</p>
              </div>
            </div>
          </a>
        )}
      </div>
    </div>
  )
}
