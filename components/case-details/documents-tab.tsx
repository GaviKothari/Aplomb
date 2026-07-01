'use client'

import React, { useRef, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  useCaseDocuments, useUploadDocument, useDeleteDocument,
  useReprocessDocument, useUpdateDocumentShare, useDocumentSignedUrl,
} from '@/lib/api/hooks'
import {
  FileText, Upload, Trash2, RotateCcw, Download, FileSearch,
  Clock, CheckCircle2, XCircle, Loader2, Share2, FileWarning,
} from 'lucide-react'

const CLASSIFIED_TYPE_LABELS: Record<string, string> = {
  SALE_DEED:           'Sale Deed',
  REGISTRY:            'Registry',
  AGREEMENT_TO_SELL:   'Agreement to Sell',
  PREVIOUS_VALUATION:  'Previous Valuation',
  TAX_RECEIPT:         'Tax Receipt',
  MUTATION:            'Mutation / Khatauni',
  BUILDING_PLAN:       'Building Plan',
  SANCTION_LETTER:     'Sanction Letter',
  ALLOTMENT_LETTER:    'Allotment Letter',
  POSSESSION_LETTER:   'Possession Letter',
  CHAIN_OF_TITLE:      'Chain of Title',
  OCCUPANCY_CERTIFICATE: 'Occupancy Certificate',
  OTHER:               'Other',
}

const DOCUMENT_TYPES = [
  { value: 'SALE_DEED',              label: 'Sale Deed' },
  { value: 'REGISTRY_COPY',         label: 'Registry Copy' },
  { value: 'MUTATION_KHATAUNI',      label: 'Mutation / Khatauni' },
  { value: 'PROPERTY_TAX_RECEIPT',  label: 'Property Tax Receipt' },
  { value: 'FLOOR_PLAN',            label: 'Floor Plan' },
  { value: 'LAYOUT_PLAN',           label: 'Layout Plan' },
  { value: 'POSSESSION_CERTIFICATE',label: 'Possession Certificate' },
  { value: 'BUILDING_PLAN',         label: 'Building Plan / Sanction' },
  { value: 'NOC',                   label: 'NOC / Approval Letter' },
  { value: 'ENCUMBRANCE_CERTIFICATE',label: 'Encumbrance Certificate' },
  { value: 'LOAN_AGREEMENT',        label: 'Loan Agreement' },
  { value: 'VALUATION_REPORT',      label: 'Previous Valuation Report' },
  { value: 'OTHER',                 label: 'Other' },
]

function ocrStatusMeta(status: string) {
  switch (status) {
    case 'PENDING':    return { label: 'Queued',      color: 'bg-gray-100 text-gray-600',    icon: <Clock className="w-3 h-3" /> }
    case 'PROCESSING': return { label: 'Processing',  color: 'bg-blue-100 text-blue-700',    icon: <Loader2 className="w-3 h-3 animate-spin" /> }
    case 'DONE':       return { label: 'OCR Done',    color: 'bg-green-100 text-green-700',  icon: <CheckCircle2 className="w-3 h-3" /> }
    case 'SKIPPED':    return { label: 'Text Ready',  color: 'bg-purple-100 text-purple-700',icon: <CheckCircle2 className="w-3 h-3" /> }
    case 'FAILED':     return { label: 'OCR Failed',  color: 'bg-red-100 text-red-700',      icon: <XCircle className="w-3 h-3" /> }
    default:           return { label: status ?? '—', color: 'bg-gray-100 text-gray-500',    icon: null }
  }
}

function extractionStatusMeta(status: string) {
  switch (status) {
    case 'PENDING':    return { label: 'Not extracted',  color: 'bg-gray-100 text-gray-500' }
    case 'PROCESSING': return { label: 'Extracting…',   color: 'bg-blue-100 text-blue-700' }
    case 'DONE':       return { label: 'Extracted',      color: 'bg-emerald-100 text-emerald-700' }
    case 'SKIPPED':    return { label: 'Scanned — manual', color: 'bg-amber-100 text-amber-700' }
    case 'PARTIAL':    return { label: 'Partial',         color: 'bg-amber-100 text-amber-700' }
    case 'FAILED':     return { label: 'Extract failed',  color: 'bg-red-100 text-red-700' }
    default:           return { label: '—',               color: 'bg-gray-100 text-gray-400' }
  }
}

function formatBytes(bytes: number) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

interface DocumentsTabProps {
  caseId: string
}

export function DocumentsTab({ caseId }: DocumentsTabProps) {
  const fileRef   = useRef<HTMLInputElement>(null)
  const [dragging, setDragging]   = useState(false)
  const [docType, setDocType]     = useState('OTHER')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const [expandedOcr, setExpandedOcr] = useState<string | null>(null)

  const { data: docsRaw, isLoading } = useCaseDocuments(caseId)
  const docs: any[]  = Array.isArray(docsRaw) ? docsRaw : (docsRaw?.data ?? [])
  const shareEnabled: boolean = docsRaw?.shareWithEngineer ?? false

  const upload       = useUploadDocument()
  const deleteMut    = useDeleteDocument()
  const reprocess    = useReprocessDocument()
  const updateShare  = useUpdateDocumentShare()
  const getUrl       = useDocumentSignedUrl()

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return
    const fd = new FormData()
    fd.append('file', files[0])
    fd.append('documentType', docType)
    upload.mutate({ caseId, formData: fd })
  }, [caseId, docType, upload])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  const onDownload = async (docId: string, fileName: string) => {
    const res: any = await getUrl.mutateAsync({ caseId, docId })
    const a = document.createElement('a')
    a.href = res.url
    a.download = fileName ?? 'document'
    a.target = '_blank'
    a.click()
  }

  return (
    <div className="space-y-4">
      {/* Share toggle */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Share2 className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Share documents with field engineer</p>
                <p className="text-xs text-muted-foreground">
                  When enabled, the assigned engineer can view all uploaded documents on their mobile app
                </p>
              </div>
            </div>
            <Switch
              checked={shareEnabled}
              onCheckedChange={(v) => updateShare.mutate({ caseId, share: v })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Upload zone */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Upload Document
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Label className="text-xs text-muted-foreground shrink-0">Document type</Label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger className="h-8 text-xs w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value} className="text-xs">
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${dragging ? 'border-blue-400 bg-blue-50 dark:bg-blue-950' : 'border-border hover:border-blue-300 hover:bg-muted/30'}
            `}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            {upload.isPending ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                <p className="text-sm text-muted-foreground">Uploading…</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-8 h-8 text-muted-foreground/40" />
                <p className="text-sm font-medium">Drop file here or click to browse</p>
                <p className="text-xs text-muted-foreground">PDF, JPG, PNG — max 20 MB</p>
              </div>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </CardContent>
      </Card>

      {/* Document list */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Documents
            {docs.length > 0 && (
              <Badge variant="secondary" className="text-xs font-normal">{docs.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-10 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : docs.length === 0 ? (
            <div className="py-12 text-center">
              <FileWarning className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No documents uploaded yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Upload bank documents above to start automated data extraction
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left font-medium py-2 pr-4">File</th>
                    <th className="text-left font-medium py-2 pr-4">Uploaded As</th>
                    <th className="text-left font-medium py-2 pr-4">OCR</th>
                    <th className="text-left font-medium py-2 pr-4">Extraction</th>
                    <th className="text-left font-medium py-2 pr-4">Classified As</th>
                    <th className="text-left font-medium py-2 pr-4">Size</th>
                    <th className="text-left font-medium py-2 pr-4">Uploaded</th>
                    <th className="text-right font-medium py-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {docs.map((doc: any) => {
                    const ocr         = ocrStatusMeta(doc.ocrStatus)
                    const ext         = extractionStatusMeta(doc.extractionStatus)
                    const type        = DOCUMENT_TYPES.find(t => t.value === doc.documentType)
                    const rawText     = (doc.pages ?? []).map((p: any) => p.rawText).filter(Boolean).join('\n\n--- Page break ---\n\n')
                    const ocrExpanded = expandedOcr === doc.id
                    const ocrDone     = doc.ocrStatus === 'DONE'
                    const classifiedLabel = doc.classifiedType
                      ? (CLASSIFIED_TYPE_LABELS[doc.classifiedType] ?? doc.classifiedType.replace(/_/g, ' '))
                      : null
                    const classConf = doc.classificationConfidence
                      ? Math.round(Number(doc.classificationConfidence) * 100)
                      : null
                    return (
                      <React.Fragment key={doc.id}>
                        <tr className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 shrink-0 text-muted-foreground" />
                              <span className="font-medium truncate max-w-[160px]" title={doc.originalName ?? doc.fileName}>
                                {doc.originalName ?? doc.fileName ?? 'document'}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 pr-4">
                            <span className="text-xs text-muted-foreground">
                              {type?.label ?? doc.documentType ?? '—'}
                            </span>
                          </td>
                          <td className="py-3 pr-4">
                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${ocr.color}`}>
                              {ocr.icon}
                              {ocr.label}
                            </span>
                          </td>
                          <td className="py-3 pr-4">
                            <span className={`inline-flex text-xs px-2 py-0.5 rounded-full font-medium ${ext.color}`}>
                              {ext.label}
                            </span>
                          </td>
                          <td className="py-3 pr-4">
                            {classifiedLabel ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-medium text-violet-700 dark:text-violet-400 truncate max-w-[120px]">
                                  {classifiedLabel}
                                </span>
                                {classConf !== null && (
                                  <span className="text-[10px] text-muted-foreground">
                                    {classConf}%
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground/40">—</span>
                            )}
                          </td>
                          <td className="py-3 pr-4 text-xs text-muted-foreground">
                            {formatBytes(doc.sizeBytes ?? doc.fileSize)}
                          </td>
                          <td className="py-3 pr-4 text-xs text-muted-foreground">
                            {formatDate(doc.createdAt)}
                          </td>
                          <td className="py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {ocrDone && (
                                <Button
                                  variant="ghost" size="icon" className={`h-7 w-7 ${ocrExpanded ? 'text-blue-600' : 'text-muted-foreground'}`}
                                  title="View OCR text"
                                  onClick={() => setExpandedOcr(ocrExpanded ? null : doc.id)}
                                >
                                  <FileSearch className="w-3.5 h-3.5" />
                                </Button>
                              )}
                              <Button
                                variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-amber-600"
                                title="Reprocess OCR"
                                onClick={() => reprocess.mutate({ caseId, docId: doc.id })}
                                disabled={reprocess.isPending}
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost" size="icon" className="h-7 w-7"
                                title="Download"
                                onClick={() => onDownload(doc.id, doc.fileName)}
                                disabled={getUrl.isPending}
                              >
                                <Download className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600"
                                title="Delete"
                                onClick={() => setDeleteTarget(doc.id)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                        {ocrExpanded && (
                          <tr>
                            <td colSpan={7} className="pb-3 pt-0 px-0">
                              <div className="mx-2 rounded-lg border bg-muted/40 p-3">
                                <p className="text-xs font-medium text-muted-foreground mb-2">
                                  OCR Text — {doc.pages?.length ?? 0} page(s) · engine: {doc.pages?.[0]?.ocrEngine ?? '—'}
                                </p>
                                {rawText.trim() ? (
                                  <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed text-foreground/80 max-h-64 overflow-y-auto">
                                    {rawText}
                                  </pre>
                                ) : (
                                  <p className="text-xs text-muted-foreground/60 italic">
                                    No text was extracted. The document may be a very low-quality scan, or the file
                                    may have been processed before this feature was deployed — click Reprocess (↺) to try again.
                                  </p>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the file and all extracted data from it. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (deleteTarget) deleteMut.mutate({ caseId, docId: deleteTarget })
                setDeleteTarget(null)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
