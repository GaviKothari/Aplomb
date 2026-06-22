'use client'

import { useState, useCallback, useRef } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useBulkImportCases } from '@/lib/api/hooks'
import { useOrganizations } from '@/lib/api/hooks'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertCircle,
  Download, RefreshCw, ChevronDown, ChevronUp,
} from 'lucide-react'
import * as XLSX from 'xlsx'

// ── CSV column → DTO field mapping ──────────────────────────────────────────
const COLUMN_MAP: Record<string, string> = {
  'Property Address': 'propertyAddress',
  'City': 'propertyCity',
  'State': 'propertyState',
  'Pincode': 'propertyPincode',
  'Owner Name': 'ownerName',
  'Owner Contact': 'ownerContact',
  'Owner Email': 'ownerEmail',
  'Co-Owner Name': 'coOwnerName',
  'Case Type': 'caseType',
  'Property Type': 'propertyType',
  'Priority': 'priority',
  'Property Area': 'propertyArea',
  'Area Unit': 'propertyAreaUnit',
  'Survey Number': 'surveyNumber',
  'Loan Account Number': 'loanAccountNumber',
  'Application Number': 'applicationNumber',
  'Branch Name': 'branchName',
  'Bank Contact Name': 'bankContactName',
  'Bank Contact Email': 'bankContactEmail',
  'Site Visit Date': 'siteVisitDate',
  'Notes': 'notes',
}

const REQUIRED_COLS = [
  'propertyAddress', 'propertyCity', 'propertyState',
  'propertyPincode', 'ownerName', 'caseType', 'propertyType',
]

const TEMPLATE_HEADERS = Object.keys(COLUMN_MAP)

// ── Types ────────────────────────────────────────────────────────────────────
interface ParsedRow {
  _rowNum: number
  [key: string]: any
}

interface ImportResult {
  row: number
  success: boolean
  caseNumber?: string
  error?: string
}

// ── Download template helper ─────────────────────────────────────────────────
function downloadTemplate() {
  const wb = XLSX.utils.book_new()
  const exampleRow = [
    '123 MG Road, Indiranagar', 'Bangalore', 'Karnataka', '560038',
    'Rajesh Kumar', '9876543210', 'rajesh@email.com', '',
    'RESIDENTIAL_VALUATION', 'APARTMENT', 'HIGH',
    '1200', 'sqft', 'SUR-001',
    'LN-2024-001', 'APP-001', 'Indiranagar Branch',
    'Bank Contact', 'bank@hdfc.com', '2024-07-15', 'Priority case',
  ]
  const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, exampleRow])
  ws['!cols'] = TEMPLATE_HEADERS.map(() => ({ wch: 22 }))
  XLSX.utils.book_append_sheet(wb, ws, 'Cases')
  XLSX.writeFile(wb, 'aplomb-case-import-template.xlsx')
}

// ── Row parser ───────────────────────────────────────────────────────────────
function parseRows(rawRows: any[]): ParsedRow[] {
  return rawRows.map((raw, i) => {
    const row: ParsedRow = { _rowNum: i + 2 }
    for (const [header, field] of Object.entries(COLUMN_MAP)) {
      const val = raw[header]
      if (val !== undefined && val !== null && val !== '') {
        row[field] = String(val).trim()
      }
    }
    return row
  }).filter((r) => {
    // Drop fully-empty rows
    const keys = Object.keys(r).filter((k) => k !== '_rowNum')
    return keys.length > 0
  })
}

function validateRow(row: ParsedRow): string | null {
  for (const field of REQUIRED_COLS) {
    if (!row[field]) return `Missing required field: ${field.replace(/([A-Z])/g, ' $1').trim()}`
  }
  const validTypes = ['APARTMENT', 'INDEPENDENT_HOUSE', 'PLOT', 'COMMERCIAL', 'AGRICULTURAL', 'INDUSTRIAL', 'VILLA', 'PENTHOUSE', 'ROW_HOUSE', 'SHOP', 'OFFICE']
  if (row.propertyType && !validTypes.includes(row.propertyType.toUpperCase())) {
    return `Invalid Property Type: ${row.propertyType}`
  }
  return null
}

// ── Status result row ────────────────────────────────────────────────────────
function ResultRow({ r }: { r: ImportResult }) {
  return (
    <div className={cn(
      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm',
      r.success ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-red-50 dark:bg-red-950/30',
    )}>
      {r.success
        ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
        : <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
      <span className="text-muted-foreground w-14 flex-shrink-0">Row {r.row}</span>
      {r.success
        ? <span className="font-medium text-emerald-700 dark:text-emerald-400">{r.caseNumber}</span>
        : <span className="text-red-600 dark:text-red-400">{r.error}</span>}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function ImportPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [validationErrors, setValidationErrors] = useState<Record<number, string>>({})
  const [fileName, setFileName] = useState<string | null>(null)
  const [orgId, setOrgId] = useState<string>('')
  const [results, setResults] = useState<ImportResult[] | null>(null)
  const [showAllResults, setShowAllResults] = useState(false)

  const { data: orgsData } = useOrganizations()
  const orgs = orgsData?.data ?? orgsData ?? []

  const bulkImport = useBulkImportCases()

  const processFile = useCallback((file: File) => {
    if (!file.name.match(/\.(xlsx?|csv)$/i)) {
      toast.error('Please upload a .csv, .xls, or .xlsx file')
      return
    }
    setFileName(file.name)
    setResults(null)

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const wb = XLSX.read(data, { type: 'array', cellDates: true })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const raw: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' })

        const rows = parseRows(raw)
        const errors: Record<number, string> = {}
        rows.forEach((r) => {
          const err = validateRow(r)
          if (err) errors[r._rowNum] = err
        })

        setParsedRows(rows)
        setValidationErrors(errors)

        if (rows.length === 0) {
          toast.error('No data rows found in file')
        } else {
          toast.success(`Parsed ${rows.length} row${rows.length !== 1 ? 's' : ''} from ${file.name}`)
        }
      } catch {
        toast.error('Failed to parse file — check the format')
      }
    }
    reader.readAsArrayBuffer(file)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [processFile])

  const handleImport = async () => {
    if (!orgId) { toast.error('Select a bank / organisation first'); return }
    if (parsedRows.length === 0) { toast.error('No rows to import'); return }

    const validRows = parsedRows.filter((r) => !validationErrors[r._rowNum])
    if (validRows.length === 0) { toast.error('All rows have validation errors'); return }

    // Strip internal _rowNum, attach orgId
    const dtos = validRows.map(({ _rowNum, ...rest }) => ({
      ...rest,
      organizationId: orgId,
      propertyType: rest.propertyType?.toUpperCase(),
      priority: rest.priority?.toUpperCase(),
      propertyArea: rest.propertyArea ? parseFloat(rest.propertyArea) : undefined,
    }))

    try {
      const res = await bulkImport.mutateAsync(dtos)
      setResults(res.results)
      if (res.failed === 0) {
        toast.success(`All ${res.created} cases imported successfully`)
      } else {
        toast.warning(`${res.created} imported, ${res.failed} failed`)
      }
    } catch (e: any) {
      toast.error(e.message ?? 'Import failed')
    }
  }

  const reset = () => {
    setParsedRows([])
    setValidationErrors({})
    setFileName(null)
    setResults(null)
    setOrgId('')
    if (fileRef.current) fileRef.current.value = ''
  }

  const validCount = parsedRows.filter((r) => !validationErrors[r._rowNum]).length
  const errorCount = Object.keys(validationErrors).length
  const isImporting = bulkImport.isPending

  const displayedResults = showAllResults ? results : results?.slice(0, 10)

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Bulk Case Import</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Upload a bank Excel sheet to create multiple cases at once
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2 flex-shrink-0">
            <Download className="w-4 h-4" />
            Download Template
          </Button>
        </div>

        {/* Step 1: Upload */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">1</span>
              Upload File
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={cn(
                'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all',
                isDragOver
                  ? 'border-primary bg-primary/5 scale-[1.01]'
                  : fileName
                    ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20'
                    : 'border-border hover:border-primary/50 hover:bg-muted/50',
              )}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xls,.xlsx"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f) }}
              />
              {fileName ? (
                <div className="space-y-2">
                  <FileSpreadsheet className="w-10 h-10 text-emerald-600 mx-auto" />
                  <p className="font-semibold text-emerald-700 dark:text-emerald-400">{fileName}</p>
                  <p className="text-sm text-muted-foreground">{parsedRows.length} rows parsed</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <Upload className="w-10 h-10 text-muted-foreground/50 mx-auto" />
                  <div>
                    <p className="font-medium">Drop your file here or click to browse</p>
                    <p className="text-sm text-muted-foreground mt-1">Supports .csv, .xls, .xlsx</p>
                  </div>
                </div>
              )}
            </div>

            {/* Row summary */}
            {parsedRows.length > 0 && (
              <div className="flex gap-3 flex-wrap">
                <Badge variant="secondary" className="gap-1.5">
                  <FileSpreadsheet className="w-3 h-3" />
                  {parsedRows.length} rows total
                </Badge>
                {validCount > 0 && (
                  <Badge className="gap-1.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border-0">
                    <CheckCircle2 className="w-3 h-3" />
                    {validCount} valid
                  </Badge>
                )}
                {errorCount > 0 && (
                  <Badge className="gap-1.5 bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border-0">
                    <AlertCircle className="w-3 h-3" />
                    {errorCount} with errors
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Preview */}
        {parsedRows.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">2</span>
                Preview (first {Math.min(parsedRows.length, 5)} rows)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left px-3 py-2 text-muted-foreground font-medium w-12">#</th>
                      <th className="text-left px-3 py-2 text-muted-foreground font-medium">Address</th>
                      <th className="text-left px-3 py-2 text-muted-foreground font-medium">City</th>
                      <th className="text-left px-3 py-2 text-muted-foreground font-medium">Pincode</th>
                      <th className="text-left px-3 py-2 text-muted-foreground font-medium">Owner</th>
                      <th className="text-left px-3 py-2 text-muted-foreground font-medium">Type</th>
                      <th className="text-left px-3 py-2 text-muted-foreground font-medium">Priority</th>
                      <th className="text-left px-3 py-2 text-muted-foreground font-medium w-8">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.slice(0, 5).map((row) => {
                      const err = validationErrors[row._rowNum]
                      return (
                        <tr
                          key={row._rowNum}
                          className={cn(
                            'border-b last:border-0',
                            err ? 'bg-red-50 dark:bg-red-950/20' : '',
                          )}
                        >
                          <td className="px-3 py-2 text-muted-foreground">{row._rowNum}</td>
                          <td className="px-3 py-2 max-w-[180px] truncate">{row.propertyAddress}</td>
                          <td className="px-3 py-2">{row.propertyCity}</td>
                          <td className="px-3 py-2">{row.propertyPincode}</td>
                          <td className="px-3 py-2 truncate max-w-[120px]">{row.ownerName}</td>
                          <td className="px-3 py-2">{row.propertyType}</td>
                          <td className="px-3 py-2">{row.priority ?? '—'}</td>
                          <td className="px-3 py-2">
                            {err
                              ? <span title={err}><AlertCircle className="w-4 h-4 text-red-500" /></span>
                              : <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Validation error list */}
              {errorCount > 0 && (
                <div className="mt-3 space-y-1">
                  {Object.entries(validationErrors).map(([rowNum, err]) => (
                    <div key={rowNum} className="flex gap-2 text-xs text-red-600 dark:text-red-400">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      <span>Row {rowNum}: {err} — this row will be skipped</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 3: Configure & Import */}
        {parsedRows.length > 0 && !results && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">3</span>
                Select Bank & Import
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Bank / Organisation</label>
                <Select value={orgId} onValueChange={setOrgId}>
                  <SelectTrigger className="w-full max-w-sm">
                    <SelectValue placeholder="Select bank…" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Array.isArray(orgs) ? orgs : []).map((o: any) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3 items-center">
                <Button
                  onClick={handleImport}
                  disabled={!orgId || validCount === 0 || isImporting}
                  className="gap-2"
                >
                  {isImporting
                    ? <RefreshCw className="w-4 h-4 animate-spin" />
                    : <Upload className="w-4 h-4" />}
                  {isImporting ? 'Importing…' : `Import ${validCount} Case${validCount !== 1 ? 's' : ''}`}
                </Button>
                <Button variant="ghost" size="sm" onClick={reset} disabled={isImporting}>
                  Start over
                </Button>
              </div>

              {isImporting && (
                <div className="space-y-1.5">
                  <Progress value={undefined} className="h-1.5 animate-pulse" />
                  <p className="text-xs text-muted-foreground">Creating cases one by one…</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {results && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  Import Results
                </CardTitle>
                <div className="flex gap-2">
                  <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border-0">
                    {results.filter((r) => r.success).length} created
                  </Badge>
                  {results.filter((r) => !r.success).length > 0 && (
                    <Badge className="bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 border-0">
                      {results.filter((r) => !r.success).length} failed
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {displayedResults?.map((r) => <ResultRow key={r.row} r={r} />)}

              {results.length > 10 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full gap-1.5 text-xs"
                  onClick={() => setShowAllResults((p) => !p)}
                >
                  {showAllResults
                    ? <><ChevronUp className="w-3.5 h-3.5" /> Show less</>
                    : <><ChevronDown className="w-3.5 h-3.5" /> Show all {results.length} results</>}
                </Button>
              )}

              <div className="pt-2">
                <Button variant="outline" size="sm" onClick={reset}>
                  Import another file
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  )
}
