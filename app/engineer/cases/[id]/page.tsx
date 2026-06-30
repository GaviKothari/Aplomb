'use client'

import { useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useCase, useUpdateCaseStatus, useSubmitFieldData, useUploadCasePhotos } from '@/lib/api/hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Phone, MapPin, Navigation, Camera, ArrowLeft,
  PlayCircle, CheckCircle2, Upload, AlertTriangle,
  ChevronDown, ChevronUp, Loader2, Bot,
} from 'lucide-react'
import Link from 'next/link'

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

const PROPERTY_TYPES = ['Flat/Apartment', 'Independent House', 'Plot/Land', 'Commercial Shop', 'Commercial Office', 'Warehouse', 'Villa', 'Builder Floor']
const CONSTRUCTION_STAGES = ['Under Construction', 'Ready to Move', 'Old Construction', 'Completed (New)']
const FACING_DIRS = ['North', 'South', 'East', 'West', 'North-East', 'North-West', 'South-East', 'South-West']
const AMENITIES_LIST = ['Lift', 'Parking', 'Club House', 'Swimming Pool', 'Gym', 'Power Backup', 'Security', 'Garden', 'Visitor Parking', 'CCTV']

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex justify-between gap-3 py-2 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium text-right max-w-[55%]">{value}</span>
    </div>
  )
}

function Section({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <Card>
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold"
        onClick={() => setOpen(v => !v)}
      >
        {title}
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && <CardContent className="pt-0 pb-4 space-y-3">{children}</CardContent>}
    </Card>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</label>
      {children}
    </div>
  )
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className={`text-xl ${n <= value ? 'text-amber-400' : 'text-muted-foreground/30'}`}
        >★</button>
      ))}
    </div>
  )
}

const SHOW_FORM_STATUSES = new Set(['SITE_VISIT_IN_PROGRESS', 'SITE_VISIT_COMPLETED', 'REVISION_REQUESTED'])

export default function EngineerCaseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data, isLoading } = useCase(id)
  const updateStatus = useUpdateCaseStatus()
  const submitField = useSubmitFieldData()
  const uploadPhotos = useUploadCasePhotos()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [photos, setPhotos] = useState<File[]>([])
  const [gpsError, setGpsError] = useState<string | null>(null)
  const [gettingGps, setGettingGps] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Field data form state
  const [form, setForm] = useState({
    propertyType: '',
    constructionStage: '',
    totalFloors: '',
    occupiedFloors: '',
    facingDirection: '',
    ageOfConstruction: '',
    carpetArea: '',
    builtUpArea: '',
    plotArea: '',
    roadWidth: '',
    landRatePerSqFt: '',
    buildingRatePerSqFt: '',
    totalMarketValue: '',
    distressValue: '',
    siteObservations: '',
    boundaryDescription: '',
    nearbyLandmarks: '',
    amenities: [] as string[],
    localityFeatures: '',
    marketabilityRating: 0,
    liquidityRating: 0,
  })

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const c = data?.data ?? data

  // Pre-fill form when case data loads (if field data already submitted)
  const [formInit, setFormInit] = useState(false)
  if (c && !formInit) {
    const fd = c.fieldData ?? {}
    if (Object.keys(fd).length > 0) {
      setForm(f => ({
        ...f,
        propertyType:         fd.propertyType        ?? f.propertyType,
        constructionStage:    fd.constructionStage    ?? f.constructionStage,
        totalFloors:          fd.totalFloors          != null ? String(fd.totalFloors)          : f.totalFloors,
        occupiedFloors:       fd.occupiedFloors       != null ? String(fd.occupiedFloors)       : f.occupiedFloors,
        facingDirection:      fd.facingDirection      ?? f.facingDirection,
        ageOfConstruction:    fd.ageOfConstruction    != null ? String(fd.ageOfConstruction)    : f.ageOfConstruction,
        carpetArea:           fd.carpetArea           != null ? String(fd.carpetArea)           : f.carpetArea,
        builtUpArea:          fd.builtUpArea          != null ? String(fd.builtUpArea)          : f.builtUpArea,
        plotArea:             fd.plotArea             != null ? String(fd.plotArea)             : f.plotArea,
        roadWidth:            fd.roadWidth            != null ? String(fd.roadWidth)            : f.roadWidth,
        landRatePerSqFt:      fd.landRatePerSqFt      != null ? String(fd.landRatePerSqFt)      : f.landRatePerSqFt,
        buildingRatePerSqFt:  fd.buildingRatePerSqFt  != null ? String(fd.buildingRatePerSqFt)  : f.buildingRatePerSqFt,
        totalMarketValue:     fd.totalMarketValue     != null ? String(fd.totalMarketValue)     : f.totalMarketValue,
        distressValue:        fd.distressValue        != null ? String(fd.distressValue)        : f.distressValue,
        siteObservations:     fd.siteObservations     ?? f.siteObservations,
        boundaryDescription:  fd.boundaryDescription  ?? f.boundaryDescription,
        nearbyLandmarks:      fd.nearbyLandmarks      ?? f.nearbyLandmarks,
        localityFeatures:     Array.isArray(fd.localityFeatures) ? fd.localityFeatures.join(', ') : (fd.localityFeatures ?? f.localityFeatures),
        amenities:            Array.isArray(fd.amenities)        ? fd.amenities                   : f.amenities,
        marketabilityRating:  fd.marketabilityRating  ?? f.marketabilityRating,
        liquidityRating:      fd.liquidityRating      ?? f.liquidityRating,
      }))
    }
    setFormInit(true)
  }

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
      updateStatus.mutate({
        id, status: 'SITE_VISIT_IN_PROGRESS',
        lat: coords.latitude, lng: coords.longitude,
      } as any)
    } catch {
      setGpsError('Enable GPS to start site visit')
    }
  }

  const handleEndVisit = async () => {
    try {
      const coords = await getGPS()
      updateStatus.mutate({
        id, status: 'SITE_VISIT_COMPLETED',
        lat: coords.latitude, lng: coords.longitude,
      } as any)
    } catch {
      setGpsError('Enable GPS to complete site visit')
    }
  }

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    setPhotos(prev => [...prev, ...files])
    // Reset so the same file can be re-selected / iOS allows another camera shot
    e.target.value = ''
  }

  const handlePhotoUpload = async () => {
    if (photos.length === 0) return
    setUploading(true)
    try {
      await uploadPhotos.mutateAsync({ id, files: photos })
      setPhotos([])
    } catch {
      // toast is already shown by the mutation's onError handler
    } finally {
      setUploading(false)
    }
  }

  const handleSubmitFieldData = () => {
    const payload: Record<string, any> = { id }
    if (form.propertyType)        payload.propertyType        = form.propertyType
    if (form.constructionStage)   payload.constructionStage   = form.constructionStage
    if (form.totalFloors)         payload.totalFloors         = Number(form.totalFloors)
    if (form.occupiedFloors)      payload.occupiedFloors      = Number(form.occupiedFloors)
    if (form.facingDirection)     payload.facingDirection     = form.facingDirection
    if (form.ageOfConstruction)   payload.ageOfConstruction   = Number(form.ageOfConstruction)
    if (form.carpetArea)          payload.carpetArea          = Number(form.carpetArea)
    if (form.builtUpArea)         payload.builtUpArea         = Number(form.builtUpArea)
    if (form.plotArea)            payload.plotArea            = Number(form.plotArea)
    if (form.roadWidth)           payload.roadWidth           = Number(form.roadWidth)
    if (form.landRatePerSqFt)     payload.landRatePerSqFt     = Number(form.landRatePerSqFt)
    if (form.buildingRatePerSqFt) payload.buildingRatePerSqFt = Number(form.buildingRatePerSqFt)
    if (form.totalMarketValue)    payload.totalMarketValue    = Number(form.totalMarketValue)
    if (form.distressValue)       payload.distressValue       = Number(form.distressValue)
    if (form.siteObservations)    payload.siteObservations    = form.siteObservations
    if (form.boundaryDescription) payload.boundaryDescription = form.boundaryDescription
    if (form.nearbyLandmarks)     payload.nearbyLandmarks     = form.nearbyLandmarks
    if (form.localityFeatures)    payload.localityFeatures    = form.localityFeatures.split(',').map(s => s.trim()).filter(Boolean)
    if (form.amenities.length)    payload.amenities           = form.amenities
    if (form.marketabilityRating) payload.marketabilityRating = form.marketabilityRating
    if (form.liquidityRating)     payload.liquidityRating     = form.liquidityRating

    submitField.mutate(payload as { id: string; [k: string]: any })
  }

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
  const showForm = SHOW_FORM_STATUSES.has(status)
  const ownerPhone = c.ownerContact ?? c.ownerPhone
  const address = c.propertyAddress

  const mapsUrl = c.latitude && c.longitude
    ? `https://maps.google.com/?q=${c.latitude},${c.longitude}`
    : `https://maps.google.com/?q=${encodeURIComponent(address ?? '')}`

  return (
    <div className="p-4 space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 pt-1">
        <button onClick={() => router.back()} className="p-1 -ml-1 rounded-md hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <h1 className="font-bold text-base truncate">{c.caseNumber ?? id.slice(0, 8).toUpperCase()}</h1>
          <p className="text-xs text-muted-foreground">{c.organization?.name}</p>
        </div>
        <Badge className={`ml-auto shrink-0 text-[10px] ${STATUS_COLOR[status] ?? 'bg-slate-100 text-slate-700'}`}>
          {STATUS_LABEL[status] ?? status}
        </Badge>
      </div>

      {/* Quick actions */}
      {(ownerPhone || address) && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex gap-2">
              {ownerPhone && (
                <a href={`tel:${ownerPhone}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full gap-2 text-xs h-10">
                    <Phone className="h-4 w-4 text-emerald-600" />
                    Call Owner
                  </Button>
                </a>
              )}
              <a href={mapsUrl} target="_blank" rel="noreferrer" className="flex-1">
                <Button variant="outline" size="sm" className="w-full gap-2 text-xs h-10">
                  <Navigation className="h-4 w-4 text-blue-600" />
                  Navigate
                </Button>
              </a>
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
          <InfoRow label="Address"    value={address} />
          <InfoRow label="Owner"      value={c.ownerName} />
          <InfoRow label="Phone"      value={ownerPhone} />
          <InfoRow label="Bank"       value={c.organization?.name} />
          <InfoRow label="Loan Ref"   value={c.loanAccountNumber} />
          <InfoRow label="Branch"     value={c.branchName} />
          <InfoRow label="Priority"   value={c.priority} />
          <InfoRow label="Site Visit" value={c.siteVisitDate ? new Date(c.siteVisitDate).toLocaleDateString('en-IN') : null} />
          {c.notes && (
            <div className="mt-2 pt-2 border-t border-border/40">
              <p className="text-xs text-muted-foreground mb-1">Notes from office</p>
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
          {(status === 'ASSIGNED' || status === 'SITE_VISIT_SCHEDULED') && (
            <Button
              onClick={handleStartVisit}
              disabled={updateStatus.isPending || gettingGps}
              className="w-full gap-2 bg-purple-600 hover:bg-purple-700 text-white"
            >
              <PlayCircle className="h-4 w-4" />
              {gettingGps ? 'Getting GPS…' : updateStatus.isPending ? 'Starting…' : 'Start Site Visit'}
            </Button>
          )}
          {status === 'SITE_VISIT_IN_PROGRESS' && (
            <div className="space-y-2">
              <Link href={`/engineer/cases/${id}/inspect`} className="block">
                <Button className="w-full gap-2 bg-[#075E54] hover:bg-[#064d45] text-white">
                  <Bot className="h-4 w-4" />
                  Start AI Inspection
                </Button>
              </Link>
              <Button
                onClick={handleEndVisit}
                disabled={updateStatus.isPending || gettingGps}
                variant="outline"
                className="w-full gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                {gettingGps ? 'Getting GPS…' : updateStatus.isPending ? 'Saving…' : 'Complete Site Visit'}
              </Button>
            </div>
          )}
          {status === 'SITE_VISIT_COMPLETED' && (
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-sm">
              <CheckCircle2 className="h-4 w-4" />
              Site visit completed
            </div>
          )}
        </CardContent>
      </Card>

      {/* Photos */}
      <Card>
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-sm">Site Photos</CardTitle>
        </CardHeader>
        <CardContent className="pb-4 space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
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
            {photos.length > 0 ? `${photos.length} photo${photos.length > 1 ? 's' : ''} selected` : 'Take / Select Photos'}
          </Button>

          {photos.length > 0 && (
            <>
              <div className="grid grid-cols-4 gap-1.5">
                {photos.map((f, i) => (
                  <div key={i} className="aspect-square rounded-md overflow-hidden bg-muted relative">
                    <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setPhotos(p => p.filter((_, j) => j !== i))}
                      className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full w-4 h-4 text-[10px] leading-none flex items-center justify-center"
                    >✕</button>
                  </div>
                ))}
              </div>
              <Button
                className="w-full gap-2 text-xs"
                size="sm"
                onClick={handlePhotoUpload}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? 'Uploading…' : `Upload ${photos.length} Photo${photos.length > 1 ? 's' : ''}`}
              </Button>
            </>
          )}

          {/* Existing uploaded photos */}
          {c.media && c.media.length > 0 && (
            <div>
              <p className="text-[11px] text-muted-foreground mb-1.5">Uploaded ({c.media.length})</p>
              <div className="grid grid-cols-4 gap-1.5">
                {c.media.slice(0, 12).map((m: any) => (
                  <div key={m.id} className="aspect-square rounded-md overflow-hidden bg-muted">
                    <img src={m.cdnUrl ?? m.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Field observation form — only shown when visit started/completed */}
      {showForm && (
        <>
          <Section title="Property Information" defaultOpen={true}>
            <Field label="Property Type">
              <select
                value={form.propertyType}
                onChange={set('propertyType')}
                className="w-full text-xs border border-border rounded-md px-3 py-2 bg-background"
              >
                <option value="">Select type…</option>
                {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Construction Stage">
              <select
                value={form.constructionStage}
                onChange={set('constructionStage')}
                className="w-full text-xs border border-border rounded-md px-3 py-2 bg-background"
              >
                <option value="">Select stage…</option>
                {CONSTRUCTION_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Total Floors">
                <Input type="number" value={form.totalFloors} onChange={set('totalFloors')} placeholder="e.g. 4" className="text-xs h-9" />
              </Field>
              <Field label="Property on Floor">
                <Input type="number" value={form.occupiedFloors} onChange={set('occupiedFloors')} placeholder="e.g. 2" className="text-xs h-9" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Facing">
                <select
                  value={form.facingDirection}
                  onChange={set('facingDirection')}
                  className="w-full text-xs border border-border rounded-md px-3 py-2 bg-background"
                >
                  <option value="">Select…</option>
                  {FACING_DIRS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </Field>
              <Field label="Age (years)">
                <Input type="number" value={form.ageOfConstruction} onChange={set('ageOfConstruction')} placeholder="e.g. 10" className="text-xs h-9" />
              </Field>
            </div>
          </Section>

          <Section title="Measurements">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Carpet Area (sqft)">
                <Input type="number" value={form.carpetArea} onChange={set('carpetArea')} placeholder="0" className="text-xs h-9" />
              </Field>
              <Field label="Built-up Area (sqft)">
                <Input type="number" value={form.builtUpArea} onChange={set('builtUpArea')} placeholder="0" className="text-xs h-9" />
              </Field>
              <Field label="Plot Area (sqft)">
                <Input type="number" value={form.plotArea} onChange={set('plotArea')} placeholder="0" className="text-xs h-9" />
              </Field>
              <Field label="Road Width (ft)">
                <Input type="number" value={form.roadWidth} onChange={set('roadWidth')} placeholder="0" className="text-xs h-9" />
              </Field>
            </div>
          </Section>

          <Section title="Valuation">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Land Rate (₹/sqft)">
                <Input type="number" value={form.landRatePerSqFt} onChange={set('landRatePerSqFt')} placeholder="0" className="text-xs h-9" />
              </Field>
              <Field label="Building Rate (₹/sqft)">
                <Input type="number" value={form.buildingRatePerSqFt} onChange={set('buildingRatePerSqFt')} placeholder="0" className="text-xs h-9" />
              </Field>
            </div>
            <Field label="Total Market Value (₹)">
              <Input type="number" value={form.totalMarketValue} onChange={set('totalMarketValue')} placeholder="e.g. 5000000" className="text-xs h-9" />
            </Field>
            <Field label="Distress Value (₹)">
              <Input type="number" value={form.distressValue} onChange={set('distressValue')} placeholder="e.g. 4000000" className="text-xs h-9" />
            </Field>
          </Section>

          <Section title="Site Observations">
            <Field label="Site Observations">
              <Textarea
                value={form.siteObservations}
                onChange={set('siteObservations')}
                placeholder="Describe the current condition of the property, structure, quality of construction…"
                className="text-xs min-h-[90px]"
              />
            </Field>
            <Field label="Boundary Description">
              <Textarea
                value={form.boundaryDescription}
                onChange={set('boundaryDescription')}
                placeholder="North: Road, South: House, East: Plot, West: Lane…"
                className="text-xs min-h-[70px]"
              />
            </Field>
            <Field label="Nearby Landmarks">
              <Input value={form.nearbyLandmarks} onChange={set('nearbyLandmarks')} placeholder="School, hospital, metro station…" className="text-xs h-9" />
            </Field>
            <Field label="Locality Features (comma separated)">
              <Input value={form.localityFeatures} onChange={set('localityFeatures')} placeholder="Metro nearby, good connectivity…" className="text-xs h-9" />
            </Field>
            <Field label="Amenities">
              <div className="flex flex-wrap gap-1.5 mt-1">
                {AMENITIES_LIST.map(a => {
                  const checked = form.amenities.includes(a)
                  return (
                    <button
                      key={a}
                      onClick={() => setForm(f => ({
                        ...f,
                        amenities: checked ? f.amenities.filter(x => x !== a) : [...f.amenities, a],
                      }))}
                      className={`text-[11px] px-2 py-1 rounded-full border transition-colors ${
                        checked ? 'bg-blue-600 text-white border-blue-600' : 'border-border text-muted-foreground'
                      }`}
                    >
                      {a}
                    </button>
                  )
                })}
              </div>
            </Field>
          </Section>

          <Section title="Ratings">
            <Field label="Marketability (1 = low, 5 = high)">
              <StarRating value={form.marketabilityRating} onChange={v => setForm(f => ({ ...f, marketabilityRating: v }))} />
            </Field>
            <Field label="Liquidity (1 = low, 5 = high)">
              <StarRating value={form.liquidityRating} onChange={v => setForm(f => ({ ...f, liquidityRating: v }))} />
            </Field>
          </Section>

          {/* Submit */}
          <Button
            onClick={handleSubmitFieldData}
            disabled={submitField.isPending}
            className="w-full h-11 gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
          >
            {submitField.isPending
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
              : <><CheckCircle2 className="h-4 w-4" /> Save Field Data</>
            }
          </Button>
        </>
      )}

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
