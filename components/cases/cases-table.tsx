'use client'

import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { StatusBadge } from './status-badge'
import { CaseFilters, FilterState } from './case-filters'
import { useUploadDocument } from '@/lib/api/hooks'
import { Upload, Loader2, FileText } from 'lucide-react'

const DOCUMENT_TYPES = [
  { value: 'SALE_DEED',               label: 'Sale Deed' },
  { value: 'REGISTRY_COPY',           label: 'Registry Copy' },
  { value: 'MUTATION_KHATAUNI',        label: 'Mutation / Khatauni' },
  { value: 'PROPERTY_TAX_RECEIPT',    label: 'Property Tax Receipt' },
  { value: 'FLOOR_PLAN',              label: 'Floor Plan' },
  { value: 'LAYOUT_PLAN',             label: 'Layout Plan' },
  { value: 'POSSESSION_CERTIFICATE',  label: 'Possession Certificate' },
  { value: 'BUILDING_PLAN',           label: 'Building Plan / Sanction' },
  { value: 'NOC',                     label: 'NOC / Approval Letter' },
  { value: 'ENCUMBRANCE_CERTIFICATE', label: 'Encumbrance Certificate' },
  { value: 'LOAN_AGREEMENT',          label: 'Loan Agreement' },
  { value: 'VALUATION_REPORT',        label: 'Previous Valuation Report' },
  { value: 'OTHER',                   label: 'Other' },
]

function UploadDocModal({
  caseId,
  caseNumber,
  open,
  onClose,
}: {
  caseId: string
  caseNumber: string
  open: boolean
  onClose: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [docType, setDocType] = useState('OTHER')
  const [file, setFile] = useState<File | null>(null)
  const upload = useUploadDocument()

  const handleSubmit = () => {
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    fd.append('documentType', docType)
    upload.mutate(
      { caseId, formData: fd },
      {
        onSuccess: () => {
          setFile(null)
          setDocType('OTHER')
          onClose()
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Upload Document</DialogTitle>
          <p className="text-xs text-muted-foreground font-mono">{caseNumber}</p>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label className="text-xs">Document type</Label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div
            className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-blue-300 hover:bg-muted/30 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            {file ? (
              <div className="flex items-center justify-center gap-2 text-sm">
                <FileText className="w-4 h-4 text-blue-500" />
                <span className="font-medium truncate max-w-[200px]">{file.name}</span>
              </div>
            ) : (
              <div className="space-y-1">
                <Upload className="w-6 h-6 text-muted-foreground/40 mx-auto" />
                <p className="text-xs text-muted-foreground">Click to choose file</p>
                <p className="text-xs text-muted-foreground/60">PDF, JPG, PNG — max 20 MB</p>
              </div>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />

          <div className="flex gap-2 justify-end pt-1">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button
              size="sm"
              disabled={!file || upload.isPending}
              onClick={handleSubmit}
              className="gap-1.5"
            >
              {upload.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              Upload
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface CasesTableProps {
  cases: any[]  // accepts raw API shape or legacy mock shape
}

/** Normalise a raw API case to the flat string fields this component expects */
function normalise(c: any): any {
  return {
    ...c,
    bank:        typeof c.bank === 'string' ? c.bank : (c.organization?.name ?? '—'),
    engineer:    typeof c.engineer === 'string' ? c.engineer : (c.engineer?.name ?? '—'),
    priority:    c.priority?.toLowerCase() ?? 'low',
    createdDate: c.createdDate ?? c.createdAt,
    lastUpdated: c.lastUpdated ?? c.updatedAt,
  }
}

const priorityColors: Record<string, string> = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800',
  critical: 'bg-red-200 text-red-900',
}

export function CasesTable({ cases }: CasesTableProps) {
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    statuses: [],
    banks: [],
    priorities: [],
    engineers: [],
  })
  const [uploadTarget, setUploadTarget] = useState<{ id: string; caseNumber: string } | null>(null)

  const filteredCases = useMemo(() => {
    return cases.map(normalise).filter((caseItem) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        if (
          !caseItem.id.toLowerCase().includes(searchLower) &&
          !caseItem.propertyAddress.toLowerCase().includes(searchLower)
        ) {
          return false
        }
      }

      // Status filter
      if (filters.statuses.length > 0 && !filters.statuses.includes(caseItem.status)) {
        return false
      }

      // Bank filter
      if (filters.banks.length > 0 && !filters.banks.includes(caseItem.bank)) {
        return false
      }

      // Priority filter
      if (filters.priorities.length > 0 && !filters.priorities.includes(caseItem.priority)) {
        return false
      }

      // Engineer filter
      if (filters.engineers.length > 0 && !filters.engineers.includes(caseItem.engineer)) {
        return false
      }

      return true
    })
  }, [cases, filters])

  return (
    <div className="space-y-4">
      <CaseFilters onFilterChange={setFilters} />

      <Card className="border-0 shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead className="text-xs font-semibold">Case ID</TableHead>
                <TableHead className="text-xs font-semibold">Property Address</TableHead>
                <TableHead className="text-xs font-semibold">Bank</TableHead>
                <TableHead className="text-xs font-semibold">Engineer</TableHead>
                <TableHead className="text-xs font-semibold">Status</TableHead>
                <TableHead className="text-xs font-semibold">Priority</TableHead>
                <TableHead className="text-xs font-semibold">Created Date</TableHead>
                <TableHead className="text-xs font-semibold">Last Updated</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCases.length > 0 ? (
                filteredCases.map((caseItem) => (
                  <TableRow key={caseItem.id} className="border-border hover:bg-muted/50">
                    <TableCell className="text-sm font-medium">
                      <Link href={`/operations/cases/${caseItem.id}`} className="text-primary hover:underline font-mono">
                        {caseItem.caseNumber ?? caseItem.id}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {caseItem.propertyAddress}
                    </TableCell>
                    <TableCell className="text-sm">{caseItem.bank}</TableCell>
                    <TableCell className="text-sm">{caseItem.engineer}</TableCell>
                    <TableCell>
                      <StatusBadge status={caseItem.status} />
                    </TableCell>
                    <TableCell>
                      <Badge className={priorityColors[caseItem.priority] ?? 'bg-gray-100 text-gray-700'}>
                        {caseItem.priority.charAt(0).toUpperCase() + caseItem.priority.slice(1).toLowerCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {caseItem.createdDate ? new Date(caseItem.createdDate).toLocaleDateString('en-IN') : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {caseItem.lastUpdated ? new Date(caseItem.lastUpdated).toLocaleDateString('en-IN') : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        title="Upload document"
                        onClick={(e) => {
                          e.preventDefault()
                          setUploadTarget({ id: caseItem.id, caseNumber: caseItem.caseNumber ?? caseItem.id })
                        }}
                      >
                        <Upload className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No cases found matching your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <div className="text-sm text-muted-foreground">
        Showing {filteredCases.length} of {cases.length} cases
      </div>

      {uploadTarget && (
        <UploadDocModal
          caseId={uploadTarget.id}
          caseNumber={uploadTarget.caseNumber}
          open={!!uploadTarget}
          onClose={() => setUploadTarget(null)}
        />
      )}
    </div>
  )
}
