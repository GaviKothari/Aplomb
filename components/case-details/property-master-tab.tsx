'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import {
  usePropertyMaster, useUpdatePropertyField, useDeletePropertyField,
  useUpdatePropertyMasterStatus,
} from '@/lib/api/hooks'
import {
  Database, AlertTriangle, CheckCircle2, Edit3, Trash2,
  Save, X, Plus, Loader2, Clock, History, ChevronDown, ChevronUp,
} from 'lucide-react'

const STATUS_CONFIG: Record<string, { label: string; color: string; next: string | null; nextLabel: string | null }> = {
  DRAFT: {
    label: 'Draft',
    color: 'bg-gray-100 text-gray-600',
    next: 'REVIEWED',
    nextLabel: 'Mark as Reviewed',
  },
  REVIEWED: {
    label: 'Reviewed',
    color: 'bg-blue-100 text-blue-700',
    next: 'CONFIRMED',
    nextLabel: 'Confirm & Lock',
  },
  CONFIRMED: {
    label: 'Confirmed',
    color: 'bg-green-100 text-green-700',
    next: null,
    nextLabel: null,
  },
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const color = pct >= 85 ? 'bg-green-500' : pct >= 60 ? 'bg-amber-400' : 'bg-red-400'
  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 h-1.5 rounded-full bg-gray-200 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground w-7 text-right">{pct}%</span>
    </div>
  )
}

interface FieldRowProps {
  field: any
  caseId: string
  locked: boolean
}

function FieldRow({ field, caseId, locked }: FieldRowProps) {
  const [editing, setEditing] = useState(false)
  const [value, setValue]     = useState(field.fieldValue ?? '')

  const updateField = useUpdatePropertyField()
  const deleteField = useDeletePropertyField()

  const save = () => {
    updateField.mutate({ caseId, fieldKey: field.fieldKey, fieldValue: value })
    setEditing(false)
  }

  const cancel = () => {
    setValue(field.fieldValue ?? '')
    setEditing(false)
  }

  const isLow = field.confidence != null && field.confidence < 0.75 && !field.isManualEdit

  return (
    <tr className={`border-b last:border-0 transition-colors ${isLow ? 'bg-amber-50/60 dark:bg-amber-950/20' : 'hover:bg-muted/20'}`}>
      <td className="py-2.5 pr-3 align-middle">
        <div className="flex items-center gap-1.5">
          {isLow && <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />}
          <span className="text-xs font-medium text-muted-foreground">
            {field.label ?? field.fieldKey}
          </span>
        </div>
      </td>
      <td className="py-2.5 pr-3 align-middle w-full">
        {editing ? (
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="h-7 text-sm"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') save()
              if (e.key === 'Escape') cancel()
            }}
          />
        ) : (
          <span className="text-sm">{field.fieldValue || <span className="text-muted-foreground/50 italic">—</span>}</span>
        )}
      </td>
      <td className="py-2.5 pr-3 align-middle whitespace-nowrap">
        {field.confidence != null ? (
          <ConfidenceBar value={field.confidence} />
        ) : (
          <span className="text-xs text-muted-foreground/40">manual</span>
        )}
      </td>
      <td className="py-2.5 pr-3 align-middle text-xs text-muted-foreground whitespace-nowrap">
        {field.sourcePage ? `p.${field.sourcePage}` : '—'}
      </td>
      <td className="py-2.5 align-middle text-right whitespace-nowrap">
        {!locked && (
          <div className="flex items-center justify-end gap-0.5">
            {editing ? (
              <>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-green-600" onClick={save}>
                  <Save className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={cancel}>
                  <X className="w-3 h-3" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost" size="icon" className="h-6 w-6"
                  onClick={() => { setValue(field.fieldValue ?? ''); setEditing(true) }}
                >
                  <Edit3 className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost" size="icon" className="h-6 w-6 text-red-400 hover:text-red-600"
                  onClick={() => deleteField.mutate({ caseId, fieldKey: field.fieldKey })}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </>
            )}
          </div>
        )}
      </td>
    </tr>
  )
}

interface PropertyMasterTabProps {
  caseId: string
}

export function PropertyMasterTab({ caseId }: PropertyMasterTabProps) {
  const [showHistory, setShowHistory] = useState(false)
  const [addKey,   setAddKey]   = useState('')
  const [addValue, setAddValue] = useState('')
  const [addOpen,  setAddOpen]  = useState(false)

  const { data: master, isLoading } = usePropertyMaster(caseId)
  const updateStatus  = useUpdatePropertyMasterStatus()
  const updateField   = useUpdatePropertyField()

  if (isLoading) {
    return (
      <div className="py-20 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!master) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="py-16 text-center">
          <Database className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No property data extracted yet</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Upload and process documents in the Documents tab to populate the property master record
          </p>
        </CardContent>
      </Card>
    )
  }

  const fields: any[]    = master.fields ?? []
  const history: any[]   = master.history ?? []
  const statusCfg        = STATUS_CONFIG[master.status] ?? STATUS_CONFIG['DRAFT']
  const locked           = master.status === 'CONFIRMED'
  const lowConfFields    = fields.filter((f: any) => f.confidence != null && f.confidence < 0.75 && !f.isManualEdit)
  const totalFields      = fields.length
  const reviewedPct      = totalFields > 0 ? Math.round(((totalFields - lowConfFields.length) / totalFields) * 100) : 100

  const addFieldSave = () => {
    if (!addKey.trim() || !addValue.trim()) return
    updateField.mutate({ caseId, fieldKey: addKey.trim(), fieldValue: addValue.trim() })
    setAddKey('')
    setAddValue('')
    setAddOpen(false)
  }

  return (
    <div className="space-y-4">
      {/* Status bar */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Database className="w-4 h-4 text-muted-foreground" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">Property Master Record</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCfg.color}`}>
                    {statusCfg.label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {totalFields} fields · {lowConfFields.length > 0
                    ? <span className="text-amber-600">{lowConfFields.length} need review</span>
                    : <span className="text-green-600">all fields reviewed</span>}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {statusCfg.next && (
                <Button
                  size="sm"
                  variant={statusCfg.next === 'CONFIRMED' ? 'default' : 'outline'}
                  onClick={() => updateStatus.mutate({ caseId, status: statusCfg.next! })}
                  disabled={updateStatus.isPending}
                  className="gap-1.5"
                >
                  {updateStatus.isPending
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : statusCfg.next === 'CONFIRMED'
                      ? <CheckCircle2 className="w-3 h-3" />
                      : <Clock className="w-3 h-3" />}
                  {statusCfg.nextLabel}
                </Button>
              )}
              {locked && (
                <div className="flex items-center gap-1.5 text-green-600 text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  Locked & Confirmed
                </div>
              )}
            </div>
          </div>

          {totalFields > 0 && (
            <div className="mt-3 space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Confidence coverage</span>
                <span>{reviewedPct}%</span>
              </div>
              <Progress value={reviewedPct} className="h-1.5" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fields table */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              Extracted Fields
              {lowConfFields.length > 0 && (
                <Badge className="bg-amber-100 text-amber-700 border-0 text-xs font-normal gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {lowConfFields.length} low confidence
                </Badge>
              )}
            </CardTitle>
            {!locked && (
              <Button
                variant="outline" size="sm" className="gap-1.5 h-7 text-xs"
                onClick={() => setAddOpen(v => !v)}
              >
                <Plus className="w-3 h-3" />
                Add field
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {addOpen && (
            <div className="mb-4 p-3 border border-dashed rounded-lg flex items-center gap-2 flex-wrap">
              <Input
                placeholder="Field key (e.g. ownerName)"
                className="h-7 text-xs flex-1 min-w-[160px]"
                value={addKey}
                onChange={(e) => setAddKey(e.target.value)}
              />
              <Input
                placeholder="Value"
                className="h-7 text-xs flex-1 min-w-[160px]"
                value={addValue}
                onChange={(e) => setAddValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addFieldSave() }}
              />
              <Button size="sm" className="h-7 text-xs gap-1" onClick={addFieldSave}>
                <Save className="w-3 h-3" /> Save
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
            </div>
          )}

          {fields.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-muted-foreground">No fields extracted yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left font-medium py-1.5 pr-3 w-40">Field</th>
                    <th className="text-left font-medium py-1.5 pr-3">Value</th>
                    <th className="text-left font-medium py-1.5 pr-3 w-28">Confidence</th>
                    <th className="text-left font-medium py-1.5 pr-3 w-16">Source</th>
                    <th className="w-16" />
                  </tr>
                </thead>
                <tbody>
                  {fields.map((f: any) => (
                    <FieldRow key={f.id ?? f.fieldKey} field={f} caseId={caseId} locked={locked} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit history */}
      {history.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <button
              className="flex items-center justify-between w-full text-left"
              onClick={() => setShowHistory(v => !v)}
            >
              <CardTitle className="text-base flex items-center gap-2 text-sm font-semibold">
                <History className="w-4 h-4" />
                Edit History
                <Badge variant="secondary" className="text-xs font-normal">{history.length}</Badge>
              </CardTitle>
              {showHistory ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>
          </CardHeader>
          {showHistory && (
            <CardContent>
              <div className="space-y-2">
                {history.slice(0, 20).map((h: any, i: number) => (
                  <div key={i} className="flex gap-3 text-xs">
                    <span className="text-muted-foreground whitespace-nowrap">
                      {new Date(h.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="font-medium">{h.fieldKey}</span>
                    <span className="text-muted-foreground">
                      {h.oldValue ? <><span className="line-through text-red-400">{h.oldValue}</span> → </> : 'set to '}
                      <span className="text-green-600">{h.newValue}</span>
                    </span>
                    {h.user?.name && <span className="text-muted-foreground ml-auto">by {h.user.name}</span>}
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  )
}
