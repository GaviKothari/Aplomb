'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

import { AppLayout } from '@/components/layout/app-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  ChevronDown,
  Home,
  Loader2,
  MapPin,
  Navigation,
  Search,
  Shield,
  User,
  Users,
  Zap,
} from 'lucide-react'
import {
  useCreateCase,
  useOrganizations,
  useBankBranches,
  useEmployees,
  useMatchDemolitionCase,
  useApi,
} from '@/lib/api/hooks'

const PROPERTY_TYPES = [
  'APF PROJECT',
  'Affordable Flat',
  'Authority Flat',
  'Builder Flat',
  'Builder Floor',
  'Bungalow',
  'Commercial Building',
  'Commercial Floor',
  'Commercial Property',
  'Commercial Shop',
  'Commercial Space',
  'DDA Flat',
  'DDA LIG Flat',
  'DDA MIG Flat',
  'DDA SFS Flat',
  'Developer Flat',
  'Developer Floor',
  'Developer Villa',
  'Duplex Flat',
  'Duplex House',
  'EWS Flat',
  'Flat',
  'GDA Flat',
  'Hospital',
  'Hotel',
  'Independent Commercial Property',
  'Independent House',
  'Individual Floor',
  'Individual House',
  'Industrial Building',
  'Janta Flat',
  'LIG Flat',
  'MIG Flat',
  'Mixed Use',
  'Office Space',
  'Pent House',
  'Proposed Building',
  'Resort',
  'Row House',
  'SCO Plot',
  'School Property',
  'Service Apartment',
  'Shop',
  'Society Flat',
  'Society Floor',
  'Under Construction',
  'Vacant Land',
  'Vacant Plot',
  'Villa',
  'Warehouse',
]

const CASE_TYPES = [
  'Home Loan',
  'LAP',
  'BT',
  'BT + Top up',
  'Purchase',
  'Resale',
  'APF',
  'APF Subsequent',
  'Self Construction',
  'Plot + Construction',
  'Top up',
  'Desktop Valuation',
  'Rental Valuation',
  'Audit',
  'Commercial Loan',
  'Land Loan',
  'Education Loan',
  'Other',
]

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Chandigarh', 'Puducherry',
]

const AREA_UNITS = ['sqft', 'sqm', 'sqyd', 'acres', 'cents', 'guntha', 'bigha']

const CONFIDENCE_STYLES: Record<string, { badge: string; row: string }> = {
  HIGH:   { badge: 'bg-red-600 text-white',     row: 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800' },
  MEDIUM: { badge: 'bg-orange-500 text-white',  row: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800' },
  LOW:    { badge: 'bg-yellow-500 text-white',  row: 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-700' },
}

/** Expandable MCD demolition notice card — mirrors the official notice format */
function LiveMatchCard({ match }: { match: any }) {
  const [expanded, setExpanded] = useState(false)
  const style = CONFIDENCE_STYLES[match.confidence] ?? CONFIDENCE_STYLES.LOW
  const mo = match.matchedOn ?? {}

  const signals: string[] = []
  if (mo.compoundCode && (mo.caseCompound ?? []).length > 0)
    signals.push(`Code: ${(mo.caseCompound as string[]).join(', ')}`)
  else if ((mo.alphaCodeHits ?? []).length > 0)
    signals.push(`Code: ${(mo.alphaCodeHits as string[]).join(', ')}`)
  if ((mo.pocketSectorHits ?? []).length > 0)
    signals.push(`Pocket/Sector: ${(mo.pocketSectorHits as string[]).join(', ')}`)
  if ((mo.matchedPlots ?? []).length > 0)
    signals.push(`Plot/No: ${(mo.matchedPlots as string[]).join(', ')}`)
  if ((mo.localityHits ?? []).length > 0)
    signals.push(`Area: ${(mo.localityHits as string[]).slice(0, 2).join(', ')}`)
  if (mo.pincode) signals.push('Pincode')
  if ((mo.ownerScore as number) > 0) signals.push('Owner name')

  const fmtDate = match.noticeDate
    ? new Date(match.noticeDate).toLocaleDateString('en-IN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      })
    : null

  return (
    <div
      className={`rounded-lg border overflow-hidden cursor-pointer select-none ${style.row}`}
      onClick={() => setExpanded(e => !e)}
    >
      {/* ── Collapsed header — official MCD notice wording ── */}
      <div className="px-3 py-2.5 text-xs">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0 space-y-1">
            {/* Badge + zone */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${style.badge}`}>
                {match.confidence} {match.score}%
              </span>
              {match.zone && (
                <span className="text-[10px] text-red-600 dark:text-red-400 font-semibold uppercase tracking-wide">
                  {match.zone}
                </span>
              )}
            </div>

            {/* Notice summary in formal MCD language */}
            <p className="leading-snug text-red-800 dark:text-red-200">
              Subject property is booked in MCD demolition list
              {match.noticeNumber && (
                <> vide file no.{' '}
                  <span className="font-semibold font-mono">{match.noticeNumber}</span>
                </>
              )}
              {fmtDate && <>, dt: <span className="font-medium">{fmtDate}</span></>}
              {match.ownerName && (
                <> in the name of <span className="font-semibold">{match.ownerName}</span></>
              )}
              {match.address && (
                <>, w.r.t. address: <span className="font-medium">{match.address}</span></>
              )}
            </p>
          </div>

          {/* Expand chevron */}
          <ChevronDown
            className={`w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-1 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {/* ── Expanded details panel ── */}
      {expanded && (
        <div
          className="border-t border-red-200 dark:border-red-800 px-3 py-3 space-y-2.5 text-xs bg-red-50/60 dark:bg-red-950/20"
          onClick={e => e.stopPropagation()}
        >
          {/* Key-value grid */}
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
            {match.noticeNumber && (
              <>
                <span className="text-red-900 dark:text-red-100 font-semibold whitespace-nowrap">File No.</span>
                <span className="font-mono text-red-700 dark:text-red-300 break-all">{match.noticeNumber}</span>
              </>
            )}
            {match.bookingId && match.bookingId !== match.noticeNumber && (
              <>
                <span className="text-red-900 dark:text-red-100 font-semibold whitespace-nowrap">Booking ID</span>
                <span className="font-mono text-red-700 dark:text-red-300">{match.bookingId}</span>
              </>
            )}
            {fmtDate && (
              <>
                <span className="text-red-900 dark:text-red-100 font-semibold whitespace-nowrap">Notice Date</span>
                <span className="text-red-700 dark:text-red-300">{fmtDate}</span>
              </>
            )}
            {match.ownerName && (
              <>
                <span className="text-red-900 dark:text-red-100 font-semibold whitespace-nowrap">Owner / Builder</span>
                <span className="text-red-700 dark:text-red-300">{match.ownerName}</span>
              </>
            )}
            {match.zone && (
              <>
                <span className="text-red-900 dark:text-red-100 font-semibold whitespace-nowrap">Zone</span>
                <span className="text-red-700 dark:text-red-300">{match.zone}</span>
              </>
            )}
            {match.locality && (
              <>
                <span className="text-red-900 dark:text-red-100 font-semibold whitespace-nowrap">Locality</span>
                <span className="text-red-700 dark:text-red-300">{match.locality}</span>
              </>
            )}
          </div>

          {/* Full address block */}
          {match.address && (
            <div className="pt-2 border-t border-red-200/70 dark:border-red-800/70">
              <span className="font-semibold text-red-900 dark:text-red-100 block mb-1">w.r.t. Address</span>
              <span className="text-red-700 dark:text-red-300 leading-snug">{match.address}</span>
            </div>
          )}

          {/* Match signals */}
          {signals.length > 0 && (
            <div className="pt-2 border-t border-red-200/70 dark:border-red-800/70">
              <span className="font-semibold text-red-900 dark:text-red-100 block mb-1">Matched on</span>
              <div className="flex flex-wrap gap-1">
                {signals.map(s => (
                  <span key={s} className="text-[10px] bg-red-200/70 dark:bg-red-900/50 text-red-800 dark:text-red-200 px-1.5 py-0.5 rounded font-mono">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Confidence score bar */}
          <div className="pt-2 border-t border-red-200/70 dark:border-red-800/70">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-red-900 dark:text-red-100">Match Confidence</span>
              <span className="font-bold text-red-700 dark:text-red-300">{match.score}/100</span>
            </div>
            <div className="h-1.5 bg-red-200 dark:bg-red-900/50 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  match.confidence === 'HIGH' ? 'bg-red-600' :
                  match.confidence === 'MEDIUM' ? 'bg-orange-500' : 'bg-yellow-500'
                }`}
                style={{ width: `${match.score}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SectionHeader({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div>
        <h3 className="font-semibold text-sm">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  )
}

export default function AddNewCasePage() {
  const router = useRouter()
  const createCase = useCreateCase()

  const [form, setForm] = useState({
    // Bank
    organizationId: '',
    caseType: '',
    priority: 'MEDIUM',
    loanAccountNumber: '',
    applicationNumber: '',
    branchName: '',
    bankContactName: '',
    bankContactEmail: '',
    // Property
    propertyAddress: '',
    propertyCity: 'Delhi',
    propertyState: 'Delhi',
    propertyPincode: '',
    propertyType: '',
    propertyArea: '',
    propertyAreaUnit: 'sqft',
    surveyNumber: '',
    googleMapsUrl: '',
    latitude: '',
    longitude: '',
    // Owner
    ownerName: '',
    ownerContact: '',
    ownerEmail: '',
    coOwnerName: '',
    // Assignment
    engineerId: '',
    verifierId: '',
    // Timeline
    siteVisitDate: '',
    slaDeadline: '',
    notes: '',
  })

  // ── Demolition live check ─────────────────────────────────────────────
  // Uses the backend's multi-signal checkAddress engine (compound code
  // extraction, locality matching, zone inference, AND-search passes).
  // This correctly handles verbose case addresses vs compact DB codes:
  //   case:  "Plot No. 57, Block BT (Paschimi), Shalimar Bagh"
  //   DB:    "BT-57  Shalimar Bagh  KESHAVPURAM ZONE"  → flagged HIGH

  const [demolitionMatches, setDemolitionMatches] = useState<any[]>([])
  const [demoChecking, setDemoChecking] = useState(false)
  const [geocoding, setGeocoding] = useState(false)

  const api = useApi()

  useEffect(() => {
    const addr = form.propertyAddress?.trim()
    if (!addr || addr.length < 8) {
      setDemolitionMatches([])
      return
    }
    const timer = setTimeout(async () => {
      setDemoChecking(true)
      try {
        const result = await api.demolition.checkAddress({
          address: addr,
          ownerName: form.ownerName || undefined,
          pincode: form.propertyPincode || undefined,
        })
        setDemolitionMatches(result.matches ?? [])
      } catch {
        setDemolitionMatches([])
      } finally {
        setDemoChecking(false)
      }
    }, 600)
    return () => clearTimeout(timer)
  }, [form.propertyAddress, form.ownerName, form.propertyPincode])

  const hasDemolitionFlag = demolitionMatches.length > 0
  const highRiskCount = demolitionMatches.filter((m: any) => m.confidence === 'HIGH').length
  const hasTypedAddress = (form.propertyAddress?.trim().length ?? 0) >= 8

  const { data: orgsData } = useOrganizations({ limit: 200 })
  const organizations: any[] = orgsData?.data ?? orgsData ?? []

  const { data: branchesData } = useBankBranches(form.organizationId || undefined)
  const branches: any[] = branchesData ?? []
  const uniqueBranches = [...new Map(branches.map(b => [b.branchName, b])).values()]
  const contactsForBranch = branches.filter(b => b.branchName === form.branchName)

  const { data: engineersData } = useEmployees({ limit: 100 })
  const employees: any[] = engineersData?.data ?? engineersData ?? []

  const matchCase = useMatchDemolitionCase()

  const set = (field: string) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm(p => ({ ...p, [field]: e.target.value }))

  const setField = (field: string, value: string) =>
    setForm(p => ({ ...p, [field]: value }))

  // Geocode address using Nominatim
  const geocodeAddress = useCallback(async () => {
    const q = [form.propertyAddress, form.propertyCity, form.propertyState, 'India']
      .filter(Boolean)
      .join(', ')
    if (!q) return
    setGeocoding(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1&countrycodes=in`,
        { headers: { 'Accept-Language': 'en' } }
      )
      const data = await res.json()
      if (data[0]) {
        const { lat, lon, display_name } = data[0]
        setForm(p => ({
          ...p,
          latitude: parseFloat(lat).toFixed(6),
          longitude: parseFloat(lon).toFixed(6),
          googleMapsUrl: `https://www.google.com/maps?q=${lat},${lon}`,
        }))
      }
    } catch {
      // silently fail
    } finally {
      setGeocoding(false)
    }
  }, [form.propertyAddress, form.propertyCity, form.propertyState])

  const mapSrc =
    form.latitude && form.longitude
      ? `https://www.openstreetmap.org/export/embed.html?bbox=${(+form.longitude - 0.008).toFixed(6)},${(+form.latitude - 0.006).toFixed(6)},${(+form.longitude + 0.008).toFixed(6)},${(+form.latitude + 0.006).toFixed(6)}&layer=mapnik&marker=${form.latitude},${form.longitude}`
      : null

  const isValid =
    form.organizationId &&
    form.propertyAddress &&
    form.propertyCity &&
    form.propertyState &&
    form.propertyPincode &&
    form.propertyType &&
    form.ownerName

  const handleSubmit = async () => {
    if (!isValid) return
    const body: any = {
      organizationId:  form.organizationId,
      caseType:        form.caseType || 'Home Loan Valuation',
      propertyType:    form.propertyType,
      priority:        form.priority,
      propertyAddress: form.propertyAddress,
      propertyCity:    form.propertyCity,
      propertyState:   form.propertyState,
      propertyPincode: form.propertyPincode,
      ownerName:       form.ownerName,
    }
    if (form.latitude)         body.latitude         = parseFloat(form.latitude)
    if (form.longitude)        body.longitude        = parseFloat(form.longitude)
    if (form.googleMapsUrl)    body.googleMapsUrl    = form.googleMapsUrl
    if (form.surveyNumber)     body.surveyNumber     = form.surveyNumber
    if (form.propertyArea)     body.propertyArea     = parseFloat(form.propertyArea)
    if (form.propertyAreaUnit) body.propertyAreaUnit = form.propertyAreaUnit
    if (form.ownerContact)     body.ownerContact     = form.ownerContact
    if (form.ownerEmail)       body.ownerEmail       = form.ownerEmail
    if (form.coOwnerName)      body.coOwnerName      = form.coOwnerName
    if (form.loanAccountNumber) body.loanAccountNumber = form.loanAccountNumber
    if (form.applicationNumber) body.applicationNumber = form.applicationNumber
    if (form.branchName)       body.branchName       = form.branchName
    if (form.bankContactName)  body.bankContactName  = form.bankContactName
    if (form.bankContactEmail) body.bankContactEmail = form.bankContactEmail
    if (form.engineerId && form.engineerId !== '__none')
      body.engineerId = form.engineerId
    if (form.verifierId && form.verifierId !== '__unassigned' && form.verifierId !== '__none')
      body.verifierId = form.verifierId
    if (form.siteVisitDate)    body.siteVisitDate    = form.siteVisitDate
    if (form.slaDeadline)      body.slaDeadline      = form.slaDeadline
    if (form.notes)            body.notes            = form.notes

    try {
      const result = await createCase.mutateAsync(body)
      // Auto-run demolition cross-match in background
      if (result?.id) {
        matchCase.mutate(result.id)
      }
      router.push('/operations/cases')
    } catch {
      // error handled by hook
    }
  }

  const completedSections = [
    !!form.organizationId,
    !!(form.propertyAddress && form.propertyCity && form.propertyPincode && form.propertyType),
    !!(form.latitude && form.longitude),
    !!form.ownerName,
    !!form.engineerId,
  ]
  const progress = Math.round((completedSections.filter(Boolean).length / completedSections.length) * 100)

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto pb-24">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">New Valuation Case</h1>
            <p className="text-sm text-muted-foreground">Fill all sections — demolition risk auto-checked as you type</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{progress}% complete</span>
            <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
          {/* ── Left: Form Sections ─────────────────────────────────── */}
          <div className="space-y-4">

            {/* Section 1: Bank / Reference */}
            <Card>
              <CardHeader className="pb-0 pt-5 px-5">
                <SectionHeader icon={Building2} title="Bank & Reference" subtitle="Which bank and loan type is this case for?" />
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <Label>Bank / Organization *</Label>
                    <Select value={form.organizationId} onValueChange={v => setForm(p => ({ ...p, organizationId: v, branchName: '', bankContactName: '' }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select bank or organization" />
                      </SelectTrigger>
                      <SelectContent>
                        {organizations.map((o: any) => (
                          <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                        ))}
                        {organizations.length === 0 && (
                          <SelectItem value="__none" disabled>No organizations found</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Case Type</Label>
                    <Select value={form.caseType} onValueChange={v => setField('caseType', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select case type" />
                      </SelectTrigger>
                      <SelectContent>
                        {CASE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Priority</Label>
                    <Select value={form.priority} onValueChange={v => setField('priority', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW"><span className="text-green-600">● Low</span></SelectItem>
                        <SelectItem value="MEDIUM"><span className="text-yellow-600">● Medium</span></SelectItem>
                        <SelectItem value="HIGH"><span className="text-orange-600">● High</span></SelectItem>
                        <SelectItem value="CRITICAL"><span className="text-red-600">● Critical</span></SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Loan Account No.</Label>
                    <Input placeholder="e.g. HDFC-2024-00123" value={form.loanAccountNumber} onChange={set('loanAccountNumber')} />
                  </div>

                  <div>
                    <Label>Application / Reference No.</Label>
                    <Input placeholder="Bank's application number" value={form.applicationNumber} onChange={set('applicationNumber')} />
                  </div>

                  <div>
                    <Label>Branch Name</Label>
                    {uniqueBranches.length > 0 ? (
                      <Select
                        value={form.branchName}
                        onValueChange={v => setForm(p => ({ ...p, branchName: v, bankContactName: '' }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select branch" />
                        </SelectTrigger>
                        <SelectContent>
                          {uniqueBranches.map(b => (
                            <SelectItem key={b.id} value={b.branchName}>{b.branchName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input placeholder="e.g. Nehru Place Branch" value={form.branchName} onChange={set('branchName')} />
                    )}
                  </div>

                  <div>
                    <Label>Bank Contact Person</Label>
                    {contactsForBranch.length > 0 ? (
                      <Select
                        value={form.bankContactName}
                        onValueChange={v => setField('bankContactName', v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select contact person" />
                        </SelectTrigger>
                        <SelectContent>
                          {contactsForBranch
                            .filter(b => b.contactName)
                            .map(b => (
                              <SelectItem key={b.id} value={b.contactName}>{b.contactName}</SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input placeholder="Name of bank officer" value={form.bankContactName} onChange={set('bankContactName')} />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 2: Property Details */}
            <Card>
              <CardHeader className="pb-0 pt-5 px-5">
                <SectionHeader icon={Home} title="Property Details" subtitle="Address auto-checks against MCD demolition database" />
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-4">
                {/* Address with live demolition check */}
                <div>
                  <Label>Property Address *</Label>
                  <div className="relative">
                    <Input
                      placeholder="Full property address, plot no., building name..."
                      value={form.propertyAddress}
                      onChange={set('propertyAddress')}
                      className={hasDemolitionFlag ? 'border-red-400 focus-visible:ring-red-400' : ''}
                    />
                    {demoChecking && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* Inline status — full results shown in sidebar */}
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                    {demoChecking ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                        <span className="text-muted-foreground">Scanning MCD database...</span>
                      </>
                    ) : hasDemolitionFlag ? (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                        <span className="text-red-600 dark:text-red-400 font-medium">
                          {demolitionMatches.length} demolition match{demolitionMatches.length > 1 ? 'es' : ''} — see sidebar
                        </span>
                      </>
                    ) : hasTypedAddress ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-emerald-600 dark:text-emerald-400">Not in MCD demolition list</span>
                      </>
                    ) : null}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="col-span-2 sm:col-span-1">
                    <Label>City *</Label>
                    <Input placeholder="City" value={form.propertyCity} onChange={set('propertyCity')} />
                  </div>
                  <div>
                    <Label>Pincode *</Label>
                    <Input placeholder="110001" maxLength={6} value={form.propertyPincode} onChange={set('propertyPincode')} />
                  </div>
                  <div>
                    <Label>State *</Label>
                    <Select value={form.propertyState} onValueChange={v => setField('propertyState', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="State" />
                      </SelectTrigger>
                      <SelectContent>
                        {INDIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <Label>Property Type *</Label>
                    <Select value={form.propertyType} onValueChange={v => setField('propertyType', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select property type" />
                      </SelectTrigger>
                      <SelectContent>
                        {PROPERTY_TYPES.map(p => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Survey / Khasra No.</Label>
                    <Input placeholder="e.g. 34/5" value={form.surveyNumber} onChange={set('surveyNumber')} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Built-up Area</Label>
                    <Input type="number" placeholder="e.g. 1200" value={form.propertyArea} onChange={set('propertyArea')} />
                  </div>
                  <div>
                    <Label>Unit</Label>
                    <Select value={form.propertyAreaUnit} onValueChange={v => setField('propertyAreaUnit', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AREA_UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 3: Map & Location */}
            <Card>
              <CardHeader className="pb-0 pt-5 px-5">
                <SectionHeader icon={MapPin} title="GPS Location" subtitle="Pin the exact property location for site visit" />
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Latitude</Label>
                    <Input
                      type="number"
                      step="0.000001"
                      placeholder="28.613939"
                      value={form.latitude}
                      onChange={set('latitude')}
                    />
                  </div>
                  <div>
                    <Label>Longitude</Label>
                    <Input
                      type="number"
                      step="0.000001"
                      placeholder="77.209023"
                      value={form.longitude}
                      onChange={set('longitude')}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={geocodeAddress}
                    disabled={geocoding || (!form.propertyAddress && !form.propertyCity)}
                    className="gap-2"
                  >
                    {geocoding ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Navigation className="w-3.5 h-3.5" />
                    )}
                    {geocoding ? 'Locating...' : 'Auto-locate from Address'}
                  </Button>
                  {form.googleMapsUrl && (
                    <a
                      href={form.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      <MapPin className="w-3 h-3" /> Open in Maps
                    </a>
                  )}
                </div>

                {/* Map Preview */}
                {mapSrc ? (
                  <div className="rounded-xl overflow-hidden border border-border h-48">
                    <iframe
                      src={mapSrc}
                      className="w-full h-full"
                      title="Property location on map"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="h-36 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground gap-2">
                    <MapPin className="w-8 h-8 opacity-30" />
                    <p className="text-xs">Enter coordinates or click Auto-locate to see map</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Section 4: Owner Details */}
            <Card>
              <CardHeader className="pb-0 pt-5 px-5">
                <SectionHeader icon={User} title="Owner / Applicant" subtitle="Property owner and contact details" />
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Owner Name *</Label>
                    <Input placeholder="Full name as per documents" value={form.ownerName} onChange={set('ownerName')} />
                  </div>
                  <div>
                    <Label>Mobile Number</Label>
                    <Input placeholder="+91 98765 43210" value={form.ownerContact} onChange={set('ownerContact')} />
                  </div>
                  <div>
                    <Label>Email Address</Label>
                    <Input type="email" placeholder="owner@email.com" value={form.ownerEmail} onChange={set('ownerEmail')} />
                  </div>
                  <div>
                    <Label>Co-owner Name</Label>
                    <Input placeholder="If jointly owned" value={form.coOwnerName} onChange={set('coOwnerName')} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 5: Team Assignment */}
            <Card>
              <CardHeader className="pb-0 pt-5 px-5">
                <SectionHeader icon={Users} title="Team Assignment" subtitle="Assign field engineer and verifier" />
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Field Engineer</Label>
                    <Select value={form.engineerId} onValueChange={v => setField('engineerId', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Assign engineer" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((e: any) => (
                          <SelectItem key={e.userId ?? e.id} value={e.userId ?? e.id}>
                            <span className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                              {e.user?.name ?? e.name}
                              {e.department && <span className="text-xs text-muted-foreground">· {e.department}</span>}
                            </span>
                          </SelectItem>
                        ))}
                        {employees.length === 0 && (
                          <SelectItem value="__none" disabled>No employees found</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Verifier</Label>
                    <Select value={form.verifierId} onValueChange={v => setField('verifierId', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Assign verifier (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__unassigned">— Unassigned —</SelectItem>
                        {employees.map((e: any) => (
                          <SelectItem key={e.userId ?? e.id} value={e.userId ?? e.id}>
                            {e.user?.name ?? e.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Site Visit Date</Label>
                    <Input type="date" value={form.siteVisitDate} onChange={set('siteVisitDate')} />
                  </div>

                  <div>
                    <Label>SLA Deadline</Label>
                    <Input type="date" value={form.slaDeadline} onChange={set('slaDeadline')} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 6: Notes */}
            <Card>
              <CardHeader className="pb-0 pt-5 px-5">
                <SectionHeader icon={Shield} title="Notes & Special Instructions" />
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <Textarea
                  placeholder="Any special instructions, access info, remarks for the engineer..."
                  rows={4}
                  value={form.notes}
                  onChange={set('notes')}
                  className="resize-none"
                />
              </CardContent>
            </Card>
          </div>

          {/* ── Right: Sticky Sidebar ──────────────────────────────── */}
          <div className="space-y-4 lg:sticky lg:top-20 max-h-[calc(100vh-6rem)] lg:overflow-y-auto">

            {/* ── Live MCD Search Panel ───────────────────────────── */}
            <Card className={
              !hasTypedAddress
                ? ''
                : hasDemolitionFlag
                  ? 'border-red-300 dark:border-red-800'
                  : 'border-emerald-200 dark:border-emerald-800'
            }>
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Search className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      MCD Demolition Check
                    </span>
                  </div>
                  {demoChecking && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
                </div>

                {/* Signal badge when active */}
                {hasTypedAddress && !demoChecking && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded font-mono text-muted-foreground">
                      compound-code · locality · plot-number
                    </span>
                  </div>
                )}
              </CardHeader>

              <CardContent className="px-4 pb-4">
                {/* Empty state */}
                {!hasTypedAddress && (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Start typing the property address — matches appear here instantly
                  </p>
                )}

                {/* Searching */}
                {hasTypedAddress && demoChecking && demolitionMatches.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-3">Scanning 1,25,000+ MCD notices...</p>
                )}

                {/* No matches */}
                {hasTypedAddress && !demoChecking && !hasDemolitionFlag && (
                  <div className="flex items-center gap-2 py-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                      Not found in MCD demolition list
                    </p>
                  </div>
                )}

                {/* Live match results */}
                {demolitionMatches.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                      <span className="text-xs font-semibold text-red-700 dark:text-red-400">
                        {demolitionMatches.length} match{demolitionMatches.length > 1 ? 'es' : ''} found
                        {highRiskCount > 0 && ` · ${highRiskCount} high confidence`}
                      </span>
                    </div>
                    {demolitionMatches.map((m: any) => (
                      <LiveMatchCard key={m.id} match={m} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Map Preview */}
            {mapSrc && (
              <Card className="overflow-hidden">
                <div className="h-40">
                  <iframe src={mapSrc} className="w-full h-full" title="Map" loading="lazy" />
                </div>
                <CardContent className="py-2 px-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3 text-red-500" />
                    <span className="truncate font-mono">{form.latitude}, {form.longitude}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Form Checklist */}
            <Card>
              <CardContent className="pt-4 pb-4 px-4">
                <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Completion</p>
                <div className="space-y-2">
                  {[
                    { label: 'Bank selected', done: !!form.organizationId },
                    { label: 'Property address & type', done: !!(form.propertyAddress && form.propertyType) },
                    { label: 'City, state, pincode', done: !!(form.propertyCity && form.propertyState && form.propertyPincode) },
                    { label: 'GPS coordinates', done: !!(form.latitude && form.longitude) },
                    { label: 'Owner name', done: !!form.ownerName },
                    { label: 'Engineer assigned', done: !!form.engineerId },
                  ].map(({ label, done }) => (
                    <div key={label} className="flex items-center gap-2">
                      {done ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-muted-foreground/40 flex-shrink-0" />
                      )}
                      <span className={`text-xs ${done ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Submit button (sidebar for desktop) */}
            <div className="hidden lg:block">
              <Button
                className="w-full gap-2"
                size="lg"
                onClick={handleSubmit}
                disabled={!isValid || createCase.isPending}
              >
                {createCase.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                {createCase.isPending ? 'Creating Case...' : 'Create Case'}
              </Button>
              {hasDemolitionFlag && (
                <p className="text-xs text-red-600 dark:text-red-400 text-center mt-2">
                  ⚠️ Demolition risk detected — review before submitting
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 backdrop-blur-sm lg:hidden">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Button variant="ghost" onClick={() => router.back()}>Cancel</Button>
          <div className="flex items-center gap-2 flex-1 justify-end">
            {hasDemolitionFlag && (
              <Badge variant="destructive" className="text-xs gap-1">
                <AlertTriangle className="w-3 h-3" /> Demolition Risk
              </Badge>
            )}
            <Button
              onClick={handleSubmit}
              disabled={!isValid || createCase.isPending}
              className="gap-2"
            >
              {createCase.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {createCase.isPending ? 'Creating...' : 'Create Case'}
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
