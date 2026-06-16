'use client'

import { useState, useRef } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useApi } from '@/lib/api/hooks'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Upload, Trash2, FileSpreadsheet, ChevronDown, ChevronUp,
  Loader2, Plus, Info, CheckCircle2,
} from 'lucide-react'
import { useOrganizations } from '@/lib/api/hooks'

const PROPERTY_TYPES = [
  { value: '', label: 'All Property Types (fallback)' },
  { value: 'RESIDENTIAL_APARTMENT', label: 'Residential Apartment / Flat' },
  { value: 'RESIDENTIAL_INDEPENDENT', label: 'Residential Independent House' },
  { value: 'RESIDENTIAL_VILLA', label: 'Residential Villa' },
  { value: 'RESIDENTIAL_PLOT', label: 'Residential Plot / Land' },
  { value: 'COMMERCIAL_OFFICE', label: 'Commercial Office' },
  { value: 'COMMERCIAL_RETAIL', label: 'Commercial Shop / Retail' },
  { value: 'COMMERCIAL_WAREHOUSE', label: 'Commercial Warehouse' },
  { value: 'INDUSTRIAL', label: 'Industrial' },
  { value: 'AGRICULTURAL', label: 'Agricultural' },
  { value: 'MIXED_USE', label: 'Mixed Use' },
]

const PLACEHOLDERS: Record<string, string> = {
  '{{caseNumber}}':          'Case / APLOMB ID',
  '{{applicationNumber}}':   'Application / Loan Number',
  '{{siteVisitDate}}':       'Date of Inspection',
  '{{reportDate}}':          'Date of Report',
  '{{ownerName}}':           'Customer / Applicant Name',
  '{{currentOwner}}':        'Current Owner / Seller',
  '{{propertyAddressBank}}': 'Address as per Bank',
  '{{propertyAddressDoc}}':  'Address as per Document',
  '{{propertyAddressSite}}': 'Address as per Site (with pincode)',
  '{{latLng}}':              'Latitude & Longitude (combined)',
  '{{propertyType}}':        'Type of Property',
  '{{projectName}}':         'Project / Colony / Society',
  '{{nearbyLandmarks}}':     'Proximity / Nearby Landmarks',
  '{{roadWidth}}':           'Road Width',
  '{{plotArea}}':            'Land / Plot Area (sqft)',
  '{{totalFloors}}':         'Total Floors in Building',
  '{{floorNumber}}':         'Property on Floor No.',
  '{{ageOfConstruction}}':   'Age of Property',
  '{{constructionStage}}':   'Construction Stage',
  '{{carpetArea}}':          'Carpet Area (sqft)',
  '{{builtUpArea}}':         'Built-up Area (sqft)',
  '{{facingDirection}}':     'Facing Direction',
  '{{siteObservations}}':    'Critical Remarks / Site Observations',
  '{{boundaryDescription}}': 'Boundary Description',
  '{{totalMarketValue}}':    'Total Market Value (₹)',
  '{{distressValue}}':       'Distress Value (₹)',
  '{{buildingRatePerSqFt}}': 'Adopted Rate (₹/sqft)',
  '{{landRatePerSqFt}}':     'Land Rate (₹/sqft)',
  '{{insuranceValue}}':      'Insurance Value (₹)',
  '{{demolitionStatus}}':    'In Demolition List (Yes/No)',
  '{{engineerName}}':        'Engineer Name',
  '{{bankName}}':            'Bank Name',
  '{{branchName}}':          'Branch Name',
  '{{amenities}}':           'Amenities',
}

function PlaceholderGuide() {
  const [open, setOpen] = useState(false)
  return (
    <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/30">
      <button
        className="w-full flex items-center gap-2 p-4 text-left"
        onClick={() => setOpen(v => !v)}
      >
        <Info className="h-4 w-4 text-blue-600 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">How to prepare your Excel template</p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">Click to see placeholders and instructions</p>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-blue-500" /> : <ChevronDown className="h-4 w-4 text-blue-500" />}
      </button>
      {open && (
        <CardContent className="pt-0 pb-4 space-y-4">
          <div className="space-y-2 text-sm text-blue-900 dark:text-blue-200">
            <p className="font-medium">Steps:</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>Open your bank's Excel report template</li>
              <li>In the cells where you want data filled in, type the placeholder below (e.g. replace "Mr. Harpreet Singh" with <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{'{{ownerName}}'}</code>)</li>
              <li>Save the Excel and upload it here tagged with the bank + property type</li>
              <li>When you click "Generate PDF" on any case, it auto-fills the matching template</li>
            </ol>
          </div>
          <div>
            <p className="text-xs font-semibold text-blue-800 dark:text-blue-300 mb-2">Available placeholders:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
              {Object.entries(PLACEHOLDERS).map(([ph, label]) => (
                <div key={ph} className="flex items-start gap-2 text-xs bg-white dark:bg-blue-950/50 rounded px-2 py-1 border border-blue-100">
                  <code className="text-blue-700 dark:text-blue-300 font-mono shrink-0">{ph}</code>
                  <span className="text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

function TemplateCard({
  t, onUpload, onDelete,
}: {
  t: any
  onUpload: (id: string, file: File) => void
  onDelete: (id: string) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-sm truncate">{t.name}</p>
              {t.isDefault && <Badge variant="outline" className="text-[10px]">Default</Badge>}
              {t.s3Key
                ? <span className="flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="h-3 w-3" /> Excel uploaded</span>
                : <span className="text-[11px] text-amber-600">No Excel yet</span>
              }
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t.organization ? t.organization.name : 'All Banks'} ·{' '}
              {t.propertyType ? PROPERTY_TYPES.find(p => p.value === t.propertyType)?.label ?? t.propertyType : 'All Property Types'}
            </p>
            {t.fileName && (
              <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                <FileSpreadsheet className="h-3 w-3" /> {t.fileName}
              </p>
            )}
            {t.description && <p className="text-xs text-muted-foreground mt-1">{t.description}</p>}
          </div>
          <div className="flex gap-2 shrink-0">
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0]
                if (f) onUpload(t.id, f)
                e.target.value = ''
              }}
            />
            <Button
              size="sm" variant="outline" className="gap-1.5 text-xs"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-3.5 w-3.5" />
              {t.s3Key ? 'Re-upload' : 'Upload Excel'}
            </Button>
            <Button
              size="sm" variant="ghost"
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
              onClick={() => onDelete(t.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function ReportTemplatesPage() {
  const api = useApi()
  const qc = useQueryClient()
  const { data: orgsData } = useOrganizations()
  const orgsAny = orgsData as any
  const orgs: any[] = orgsAny?.pages?.flatMap((p: any) => p.data) ?? orgsAny?.data ?? []

  const { data: templates, isLoading } = useQuery({
    queryKey: ['report-templates'],
    queryFn: () => api.reportTemplates.list(),
  })

  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({
    name: '', description: '', organizationId: '', propertyType: '', isDefault: false,
  })
  const [uploading, setUploading] = useState<string | null>(null)

  const createMut = useMutation({
    mutationFn: (body: any) => api.reportTemplates.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['report-templates'] })
      setShowAdd(false)
      setForm({ name: '', description: '', organizationId: '', propertyType: '', isDefault: false })
      toast.success('Template created — now upload the Excel file')
    },
    onError: (e: any) => toast.error(e.message),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.reportTemplates.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['report-templates'] }); toast.success('Deleted') },
    onError: (e: any) => toast.error(e.message),
  })

  const handleUpload = async (id: string, file: File) => {
    setUploading(id)
    try {
      const fd = new FormData()
      fd.append('template', file)
      await api.reportTemplates.upload(id, fd)
      qc.invalidateQueries({ queryKey: ['report-templates'] })
      toast.success(`${file.name} uploaded`)
    } catch (e: any) {
      toast.error(e.message ?? 'Upload failed')
    } finally {
      setUploading(null)
    }
  }

  const list: any[] = templates ?? []

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Report Templates</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Upload your bank-specific Excel templates. The system auto-fills engineer data and exports as PDF.
            </p>
          </div>
          <Button onClick={() => setShowAdd(v => !v)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Template
          </Button>
        </div>

        <PlaceholderGuide />

        {/* Add new form */}
        {showAdd && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">New Template</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Template Name *</label>
                  <Input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. ICICI Bank – Builder Floor"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Bank (leave blank = all banks)</label>
                  <select
                    value={form.organizationId}
                    onChange={e => setForm(f => ({ ...f, organizationId: e.target.value }))}
                    className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background"
                  >
                    <option value="">— All Banks (fallback) —</option>
                    {orgs.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Property Type (leave blank = all types)</label>
                  <select
                    value={form.propertyType}
                    onChange={e => setForm(f => ({ ...f, propertyType: e.target.value }))}
                    className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background"
                  >
                    {PROPERTY_TYPES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Description (optional)</label>
                  <Input
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="e.g. 2024 format, 5-page report"
                    className="text-sm"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={form.isDefault}
                  onChange={e => setForm(f => ({ ...f, isDefault: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="isDefault" className="text-sm text-muted-foreground">
                  Use as default fallback (when no bank/type match found)
                </label>
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  onClick={() => createMut.mutate({
                    name: form.name,
                    description: form.description || undefined,
                    organizationId: form.organizationId || undefined,
                    propertyType: form.propertyType || undefined,
                    isDefault: form.isDefault,
                  })}
                  disabled={!form.name || createMut.isPending}
                  className="gap-2"
                >
                  {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Create — then upload Excel
                </Button>
                <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Template list */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}
          </div>
        ) : list.length === 0 ? (
          <Card className="border-dashed border-0 shadow-sm">
            <CardContent className="py-16 text-center">
              <FileSpreadsheet className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No templates yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Add a template for each bank and property type combination
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {/* Group by bank */}
            {orgs.filter((o: any) => list.some((t: any) => t.organizationId === o.id)).map((org: any) => (
              <div key={org.id}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{org.name}</p>
                <div className="space-y-2">
                  {list.filter((t: any) => t.organizationId === org.id).map((t: any) => (
                    <div key={t.id} className={uploading === t.id ? 'opacity-60 pointer-events-none' : ''}>
                      <TemplateCard t={t} onUpload={handleUpload} onDelete={id => deleteMut.mutate(id)} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {/* Templates with no bank */}
            {list.filter((t: any) => !t.organizationId).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Generic / Fallback</p>
                <div className="space-y-2">
                  {list.filter((t: any) => !t.organizationId).map((t: any) => (
                    <div key={t.id} className={uploading === t.id ? 'opacity-60 pointer-events-none' : ''}>
                      <TemplateCard t={t} onUpload={handleUpload} onDelete={id => deleteMut.mutate(id)} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Priority explanation */}
        <Card className="border-0 shadow-sm bg-muted/30">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Template Selection Priority</p>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p><span className="font-medium text-foreground">1st</span> — Exact match: same bank + same property type</p>
              <p><span className="font-medium text-foreground">2nd</span> — Bank match, any property type</p>
              <p><span className="font-medium text-foreground">3rd</span> — Property type match, any bank</p>
              <p><span className="font-medium text-foreground">4th</span> — Default fallback template</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
