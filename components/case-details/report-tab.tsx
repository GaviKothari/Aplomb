'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  useCaseReport, useSubmitReport, useGenerateTemplatePdf, useUpdateReport,
} from '@/lib/api/hooks'
import { useRole } from '@/hooks/useRole'
import {
  ClipboardList, Send, Download, Loader2, Pencil, X, Check,
  CheckCircle2, AlertCircle,
} from 'lucide-react'

const STATUS_COLOR: Record<string, string> = {
  DRAFT:     'bg-slate-100 text-slate-700',
  SUBMITTED: 'bg-blue-100 text-blue-800',
  APPROVED:  'bg-emerald-100 text-emerald-800',
  REJECTED:  'bg-red-100 text-red-800',
  FINALIZED: 'bg-purple-100 text-purple-800',
}

const PROPERTY_TYPES = [
  'Residential Flat', 'Independent House', 'Builder Floor',
  'Plot / Land', 'Commercial Office', 'Commercial Shop',
  'Industrial', 'Agricultural',
]

const CONSTRUCTION_STAGES = [
  'Completed', 'Under Construction', 'Bare Shell', 'Old / Dilapidated',
]

const FACING_DIRECTIONS = ['North', 'South', 'East', 'West', 'North-East', 'North-West', 'South-East', 'South-West']

const AMENITY_OPTIONS = [
  'Lift', 'Parking', 'Power Backup', 'Security', 'Club House',
  'Swimming Pool', 'Gym', 'Park', 'Water Harvesting', 'Solar Panels',
]

function DataRow({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === '') return null
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-border/40 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  )
}

function Stars({ value }: { value?: number | null }) {
  if (!value) return <span className="text-sm text-muted-foreground">—</span>
  return <span className="text-amber-400">{'★'.repeat(value)}{'☆'.repeat(5 - value)}</span>
}

function fmtNum(v?: number | null, prefix = '') {
  if (v == null) return null
  return `${prefix}${Number(v).toLocaleString('en-IN')}`
}

function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n} type="button"
          onClick={() => onChange(n)}
          className={`text-xl transition-colors ${n <= value ? 'text-amber-400' : 'text-muted-foreground/30 hover:text-amber-300'}`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</Label>
      {children}
    </div>
  )
}

interface ReportTabProps {
  caseId: string
}

export function ReportTab({ caseId }: ReportTabProps) {
  const { data: report, isLoading } = useCaseReport(caseId)
  const submitReport = useSubmitReport()
  const generatePdf = useGenerateTemplatePdf()
  const updateReport = useUpdateReport()
  const { role } = useRole()

  const isOfficeStaff = role !== 'engineer'
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Record<string, any>>({})

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-44 w-full rounded-xl" />
      </div>
    )
  }

  if (!report) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="py-16 text-center">
          <ClipboardList className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No field data submitted yet</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Once the on-site engineer submits field data, a report is automatically created here
          </p>
        </CardContent>
      </Card>
    )
  }

  const r = report as any

  function startEdit() {
    setForm({
      propertyType:        r.propertyType ?? '',
      constructionStage:   r.constructionStage ?? '',
      facingDirection:     r.facingDirection ?? '',
      totalFloors:         r.totalFloors ?? '',
      occupiedFloors:      r.occupiedFloors ?? '',
      ageOfConstruction:   r.ageOfConstruction ?? '',
      carpetArea:          r.carpetArea ?? '',
      builtUpArea:         r.builtUpArea ?? '',
      builtUpAreaApproved: r.builtUpAreaApproved ?? '',
      plotArea:            r.plotArea ?? '',
      roadWidth:           r.roadWidth ?? '',
      landRatePerSqFt:     r.landRatePerSqFt ?? '',
      buildingRatePerSqFt: r.buildingRatePerSqFt ?? '',
      totalMarketValue:    r.totalMarketValue ?? '',
      distressValue:       r.distressValue ?? '',
      insuranceValue:      r.insuranceValue ?? '',
      siteObservations:    r.siteObservations ?? '',
      boundaryDescription: r.boundaryDescription ?? '',
      nearbyLandmarks:     r.nearbyLandmarks ?? '',
      officeRemarks:       r.officeRemarks ?? '',
      amenities:           Array.isArray(r.amenities) ? [...r.amenities] : [],
      localityFeatures:    Array.isArray(r.localityFeatures) ? r.localityFeatures.join(', ') : '',
      marketabilityRating: r.marketabilityRating ?? 0,
      liquidityRating:     r.liquidityRating ?? 0,
    })
    setEditing(true)
  }

  function set(key: string, val: any) {
    setForm((prev) => ({ ...prev, [key]: val }))
  }

  function toggleAmenity(a: string) {
    setForm((prev) => {
      const cur: string[] = prev.amenities ?? []
      return { ...prev, amenities: cur.includes(a) ? cur.filter((x: string) => x !== a) : [...cur, a] }
    })
  }

  async function saveEdits() {
    const payload: Record<string, any> = { ...form }
    const numFields = [
      'totalFloors', 'occupiedFloors', 'ageOfConstruction', 'carpetArea', 'builtUpArea',
      'builtUpAreaApproved', 'plotArea', 'roadWidth', 'landRatePerSqFt', 'buildingRatePerSqFt',
      'totalMarketValue', 'distressValue', 'insuranceValue', 'marketabilityRating', 'liquidityRating',
    ]
    for (const f of numFields) {
      if (payload[f] !== '' && payload[f] != null) payload[f] = Number(payload[f])
      else delete payload[f]
    }
    if (payload.localityFeatures) {
      payload.localityFeatures = (payload.localityFeatures as string)
        .split(',').map((s: string) => s.trim()).filter(Boolean)
    }
    await updateReport.mutateAsync({ id: r.id, fields: payload })
    setEditing(false)
  }

  const submittedDate = r.valuationAsOn || r.createdAt
    ? new Date(r.valuationAsOn ?? r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : null

  // ── EDIT MODE ──────────────────────────────────────────────────────────────
  if (editing) {
    return (
      <div className="space-y-4">
        {/* Edit header */}
        <Card className="border-0 shadow-sm border-l-4 border-l-blue-500">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-blue-700">Editing Report</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Changes override engineer field data — use for tally corrections
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={updateReport.isPending}>
                  <X className="h-4 w-4 mr-1" /> Cancel
                </Button>
                <Button size="sm" onClick={saveEdits} disabled={updateReport.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white">
                  {updateReport.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
                  Save Changes
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Property Info */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base">Property Information</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Field label="Property Type">
              <Select value={form.propertyType} onValueChange={(v) => set('propertyType', v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{PROPERTY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Construction Stage">
              <Select value={form.constructionStage} onValueChange={(v) => set('constructionStage', v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{CONSTRUCTION_STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Facing Direction">
              <Select value={form.facingDirection} onValueChange={(v) => set('facingDirection', v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{FACING_DIRECTIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Age of Construction (yrs)">
              <Input type="number" value={form.ageOfConstruction} onChange={(e) => set('ageOfConstruction', e.target.value)} />
            </Field>
            <Field label="Total Floors">
              <Input type="number" value={form.totalFloors} onChange={(e) => set('totalFloors', e.target.value)} />
            </Field>
            <Field label="Floor Number">
              <Input type="number" value={form.occupiedFloors} onChange={(e) => set('occupiedFloors', e.target.value)} />
            </Field>
          </CardContent>
        </Card>

        {/* Measurements — Tally section */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              Measurements
              <Badge variant="outline" className="text-xs font-normal text-blue-600 border-blue-200">Tally against approved plans</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Field label="Carpet Area (sqft)">
              <Input type="number" value={form.carpetArea} onChange={(e) => set('carpetArea', e.target.value)} />
            </Field>
            <Field label="Built-up Area — Field (sqft)">
              <Input type="number" value={form.builtUpArea} onChange={(e) => set('builtUpArea', e.target.value)} />
            </Field>
            <Field label="Built-up Area — Approved (sqft)">
              <Input type="number" placeholder="From approved plan" value={form.builtUpAreaApproved} onChange={(e) => set('builtUpAreaApproved', e.target.value)} />
            </Field>
            <Field label="Plot Area (sqft)">
              <Input type="number" value={form.plotArea} onChange={(e) => set('plotArea', e.target.value)} />
            </Field>
            <Field label="Road Width (ft)">
              <Input type="number" value={form.roadWidth} onChange={(e) => set('roadWidth', e.target.value)} />
            </Field>
          </CardContent>
        </Card>

        {/* Valuation */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base">Valuation</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Field label="Land Rate (₹/sqft)">
              <Input type="number" value={form.landRatePerSqFt} onChange={(e) => set('landRatePerSqFt', e.target.value)} />
            </Field>
            <Field label="Building Rate (₹/sqft)">
              <Input type="number" value={form.buildingRatePerSqFt} onChange={(e) => set('buildingRatePerSqFt', e.target.value)} />
            </Field>
            <Field label="Total Market Value (₹)">
              <Input type="number" value={form.totalMarketValue} onChange={(e) => set('totalMarketValue', e.target.value)} />
            </Field>
            <Field label="Distress Value (₹)">
              <Input type="number" value={form.distressValue} onChange={(e) => set('distressValue', e.target.value)} />
            </Field>
            <Field label="Insurance Value (₹)">
              <Input type="number" value={form.insuranceValue} onChange={(e) => set('insuranceValue', e.target.value)} />
            </Field>
          </CardContent>
        </Card>

        {/* Observations */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base">Site Observations</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Field label="Site Observations">
              <Textarea rows={3} value={form.siteObservations} onChange={(e) => set('siteObservations', e.target.value)} />
            </Field>
            <Field label="Boundary Description">
              <Textarea rows={2} value={form.boundaryDescription} onChange={(e) => set('boundaryDescription', e.target.value)} />
            </Field>
            <Field label="Nearby Landmarks">
              <Input value={form.nearbyLandmarks} onChange={(e) => set('nearbyLandmarks', e.target.value)} />
            </Field>
            <Field label="Locality Features (comma-separated)">
              <Input value={form.localityFeatures} onChange={(e) => set('localityFeatures', e.target.value)} />
            </Field>
            <Field label="Amenities">
              <div className="flex flex-wrap gap-2">
                {AMENITY_OPTIONS.map((a) => (
                  <button
                    key={a} type="button"
                    onClick={() => toggleAmenity(a)}
                    className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                      form.amenities?.includes(a)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border text-muted-foreground hover:border-primary/50'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </Field>
          </CardContent>
        </Card>

        {/* Office Remarks */}
        <Card className="border-0 shadow-sm border-l-4 border-l-amber-400">
          <CardHeader className="pb-3"><CardTitle className="text-base">Office Remarks</CardTitle></CardHeader>
          <CardContent>
            <Field label="Internal notes / corrections by office team">
              <Textarea rows={3} placeholder="Add any tally notes, corrections, or internal remarks..." value={form.officeRemarks} onChange={(e) => set('officeRemarks', e.target.value)} />
            </Field>
          </CardContent>
        </Card>

        {/* Ratings */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base">Ratings</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Marketability</span>
              <StarInput value={form.marketabilityRating} onChange={(v) => set('marketabilityRating', v)} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Liquidity</span>
              <StarInput value={form.liquidityRating} onChange={(v) => set('liquidityRating', v)} />
            </div>
          </CardContent>
        </Card>

        {/* Save footer */}
        <div className="flex gap-2 pb-4">
          <Button variant="ghost" className="flex-1" onClick={() => setEditing(false)} disabled={updateReport.isPending}>
            Cancel
          </Button>
          <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" onClick={saveEdits} disabled={updateReport.isPending}>
            {updateReport.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      </div>
    )
  }

  // ── READ MODE ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Auto-creation notice */}
      <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50">
        <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-emerald-700 dark:text-emerald-400">
          Report auto-created when engineer submitted field data
          {submittedDate ? ` on ${submittedDate}` : ''}
        </p>
      </div>

      {/* Status + actions */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Status</p>
              <Badge className={STATUS_COLOR[r.status] ?? 'bg-slate-100 text-slate-700'}>{r.status}</Badge>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">By {r.submittedBy?.name ?? 'Engineer'}</p>
              {submittedDate && <p className="text-xs text-muted-foreground">{submittedDate}</p>}
            </div>
          </div>
          <div className="flex gap-2 mt-4 flex-wrap">
            {r.status === 'DRAFT' && (
              <Button
                size="sm" variant="outline" className="gap-2 flex-1"
                onClick={() => submitReport.mutate(r.id)}
                disabled={submitReport.isPending}
              >
                {submitReport.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Submit for Verification
              </Button>
            )}
            {isOfficeStaff && (
              <Button
                size="sm" variant="outline" className="gap-2 flex-1 border-blue-200 text-blue-700 hover:bg-blue-50"
                onClick={startEdit}
              >
                <Pencil className="h-4 w-4" /> Edit / Tally
              </Button>
            )}
            <Button
              size="sm" variant="outline" className="gap-2 flex-1"
              onClick={() => generatePdf.mutate(caseId)}
              disabled={generatePdf.isPending}
            >
              {generatePdf.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Generate PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Property Info */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2"><CardTitle className="text-base">Property Information</CardTitle></CardHeader>
        <CardContent>
          <DataRow label="Property Type"       value={r.propertyType} />
          <DataRow label="Construction Stage"  value={r.constructionStage} />
          <DataRow label="Total Floors"        value={r.totalFloors} />
          <DataRow label="Property on Floor"   value={r.occupiedFloors} />
          <DataRow label="Facing"              value={r.facingDirection} />
          <DataRow label="Age of Construction" value={r.ageOfConstruction ? `${r.ageOfConstruction} years` : null} />
        </CardContent>
      </Card>

      {/* Measurements */}
      {(r.carpetArea || r.builtUpArea || r.builtUpAreaApproved || r.plotArea || r.roadWidth) && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-base">Measurements</CardTitle></CardHeader>
          <CardContent>
            <DataRow label="Carpet Area"              value={r.carpetArea          ? `${fmtNum(r.carpetArea)} sqft`          : null} />
            <DataRow label="Built-up Area (Field)"    value={r.builtUpArea         ? `${fmtNum(r.builtUpArea)} sqft`         : null} />
            <DataRow label="Built-up Area (Approved)" value={r.builtUpAreaApproved ? `${fmtNum(r.builtUpAreaApproved)} sqft` : null} />
            <DataRow label="Plot Area"                value={r.plotArea            ? `${fmtNum(r.plotArea)} sqft`            : null} />
            <DataRow label="Road Width"               value={r.roadWidth           ? `${r.roadWidth} ft`                    : null} />
          </CardContent>
        </Card>
      )}

      {/* Valuation */}
      {(r.landRatePerSqFt || r.totalMarketValue) && (
        <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
          <CardHeader className="pb-2"><CardTitle className="text-base">Valuation</CardTitle></CardHeader>
          <CardContent>
            <DataRow label="Land Rate"          value={r.landRatePerSqFt     ? `₹${fmtNum(r.landRatePerSqFt)}/sqft`     : null} />
            <DataRow label="Building Rate"      value={r.buildingRatePerSqFt ? `₹${fmtNum(r.buildingRatePerSqFt)}/sqft` : null} />
            <DataRow label="Total Market Value" value={fmtNum(r.totalMarketValue, '₹')} />
            <DataRow label="Distress Value"     value={fmtNum(r.distressValue, '₹')} />
            <DataRow label="Insurance Value"    value={fmtNum(r.insuranceValue, '₹')} />
          </CardContent>
        </Card>
      )}

      {/* Observations */}
      {(r.siteObservations || r.boundaryDescription || r.nearbyLandmarks || r.amenities?.length) && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-base">Site Observations</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {r.siteObservations && (
              <div>
                <p className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wide">Observations</p>
                <p className="text-sm">{r.siteObservations}</p>
              </div>
            )}
            {r.boundaryDescription && (
              <div>
                <p className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wide">Boundary</p>
                <p className="text-sm">{r.boundaryDescription}</p>
              </div>
            )}
            {r.nearbyLandmarks && (
              <div>
                <p className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wide">Nearby Landmarks</p>
                <p className="text-sm">{r.nearbyLandmarks}</p>
              </div>
            )}
            {r.amenities?.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Amenities</p>
                <div className="flex flex-wrap gap-1.5">
                  {r.amenities.map((a: string) => <Badge key={a} variant="secondary" className="text-xs">{a}</Badge>)}
                </div>
              </div>
            )}
            {r.localityFeatures?.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Locality Features</p>
                <div className="flex flex-wrap gap-1.5">
                  {r.localityFeatures.map((f: string) => <Badge key={f} variant="outline" className="text-xs">{f}</Badge>)}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Office Remarks */}
      {r.officeRemarks && (
        <Card className="border-0 shadow-sm border-l-4 border-l-amber-400">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              Office Remarks
              <AlertCircle className="w-4 h-4 text-amber-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{r.officeRemarks}</p>
          </CardContent>
        </Card>
      )}

      {/* Ratings */}
      {(r.marketabilityRating || r.liquidityRating) && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-base">Ratings</CardTitle></CardHeader>
          <CardContent>
            <div className="flex justify-between items-center py-2 border-b border-border/40">
              <span className="text-sm text-muted-foreground">Marketability</span>
              <Stars value={r.marketabilityRating} />
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-muted-foreground">Liquidity</span>
              <Stars value={r.liquidityRating} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
