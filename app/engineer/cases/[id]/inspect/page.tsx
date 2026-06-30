'use client'

import { useState, useRef, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useCase, useSubmitFieldData, useUploadCasePhotos } from '@/lib/api/hooks'
import { ChevronLeft, Send, Camera, ImageIcon } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

// ── Question tree ─────────────────────────────────────────────────────────────

type QType = 'choice' | 'multi' | 'number' | 'text' | 'photo'

interface Choice { label: string; value: string }
interface Question {
  id: string
  prompt: string
  hint?: string
  type: QType
  field: string
  choices?: Choice[]
  unit?: string
  skippable?: boolean
  next: string | null | ((answer: any, answers: Record<string, any>) => string | null)
}

const Q: Record<string, Question> = {
  propertyType: {
    id: 'propertyType',
    prompt: 'What type of property is this?',
    type: 'choice',
    field: 'propertyType',
    choices: [
      { label: '🏠  Residential', value: 'Residential' },
      { label: '🏢  Commercial', value: 'Commercial' },
      { label: '🌍  Plot / Land', value: 'Plot/Land' },
      { label: '🏭  Industrial', value: 'Industrial' },
    ],
    next: (_, a) => a.propertyType === 'Plot/Land' ? 'plotBoundary' : 'constructionStage',
  },

  constructionStage: {
    id: 'constructionStage',
    prompt: 'Construction stage?',
    type: 'choice',
    field: 'constructionStage',
    choices: [
      { label: 'Completed / New', value: 'Completed (New)' },
      { label: 'Ready to Move', value: 'Ready to Move' },
      { label: 'Under Construction', value: 'Under Construction' },
      { label: 'Old Construction', value: 'Old Construction' },
    ],
    next: 'totalFloors',
  },

  totalFloors: {
    id: 'totalFloors',
    prompt: 'How many floors does the building have?',
    type: 'choice',
    field: 'totalFloors',
    choices: [
      { label: 'G (ground only)', value: '1' },
      { label: 'G+1  (2 floors)', value: '2' },
      { label: 'G+2  (3 floors)', value: '3' },
      { label: 'G+3  (4 floors)', value: '4' },
      { label: 'G+4  (5 floors)', value: '5' },
      { label: 'G+5 or more', value: '6' },
    ],
    next: (_, a) => {
      if (a.propertyType === 'Residential') return 'bhkType'
      if (a.propertyType === 'Commercial') return 'commercialUsage'
      return 'amenities'
    },
  },

  bhkType: {
    id: 'bhkType',
    prompt: 'Unit configuration?',
    type: 'choice',
    field: 'propertyDescription',
    choices: ['1 RK', '1 BHK', '2 BHK', '3 BHK', '4 BHK', '5+ BHK'].map(v => ({ label: v, value: v })),
    next: 'amenities',
  },

  commercialUsage: {
    id: 'commercialUsage',
    prompt: 'How is the property currently used?',
    type: 'choice',
    field: 'propertyDescription',
    choices: [
      'Shop / Retail', 'Office Space', 'Showroom',
      'Warehouse / Godown', 'Restaurant / Hotel', 'Mixed Use', 'Vacant',
    ].map(v => ({ label: v, value: v })),
    next: 'amenities',
  },

  plotBoundary: {
    id: 'plotBoundary',
    prompt: 'What is the boundary of the plot?',
    type: 'choice',
    field: 'boundaryDescription',
    choices: [
      { label: 'Compound wall — all sides', value: 'Compound wall on all sides' },
      { label: 'Partial boundary wall', value: 'Partial boundary wall' },
      { label: 'Fencing on all sides', value: 'Fencing on all sides' },
      { label: 'No boundary wall', value: 'No boundary wall' },
    ],
    next: 'roadWidth',
  },

  amenities: {
    id: 'amenities',
    prompt: 'Which amenities are present?',
    hint: 'Select all that apply, then tap Done',
    type: 'multi',
    field: 'amenities',
    choices: [
      'Lift', 'Parking', 'Power Backup', 'Security', 'Garden',
      'Club House', 'Swimming Pool', 'CCTV', 'Gym', 'Visitor Parking',
    ].map(v => ({ label: v, value: v })),
    next: 'roadWidth',
  },

  roadWidth: {
    id: 'roadWidth',
    prompt: 'Road width in front of property?',
    type: 'number',
    field: 'roadWidth',
    unit: 'feet',
    next: 'facingDirection',
  },

  facingDirection: {
    id: 'facingDirection',
    prompt: 'Which direction does the property face?',
    type: 'choice',
    field: 'facingDirection',
    choices: ['North', 'South', 'East', 'West', 'North-East', 'North-West', 'South-East', 'South-West']
      .map(v => ({ label: v, value: v })),
    next: 'totalArea',
  },

  totalArea: {
    id: 'totalArea',
    prompt: 'Total area of the property?',
    type: 'number',
    field: 'totalArea',
    unit: 'sq ft',
    next: (_, a) => a.propertyType === 'Plot/Land' ? 'siteObservations' : 'builtUpArea',
  },

  builtUpArea: {
    id: 'builtUpArea',
    prompt: 'Built-up area?',
    type: 'number',
    field: 'builtUpArea',
    unit: 'sq ft',
    next: 'ageOfConstruction',
  },

  ageOfConstruction: {
    id: 'ageOfConstruction',
    prompt: 'Approximate age of construction?',
    type: 'choice',
    field: 'ageOfConstruction',
    choices: [
      { label: 'New  (0–5 yrs)', value: '3' },
      { label: '5–10 years', value: '7' },
      { label: '10–20 years', value: '15' },
      { label: '20–30 years', value: '25' },
      { label: '30+ years', value: '35' },
    ],
    next: 'siteObservations',
  },

  siteObservations: {
    id: 'siteObservations',
    prompt: 'Any observations or remarks?',
    hint: 'Condition, defects, encroachments — anything unusual',
    type: 'text',
    field: 'siteObservations',
    skippable: true,
    next: 'frontPhoto',
  },

  frontPhoto: {
    id: 'frontPhoto',
    prompt: '📷  Take the front elevation photo',
    hint: 'Capture the full front of the building',
    type: 'photo',
    field: '_photo',
    skippable: true,
    next: 'landRate',
  },

  landRate: {
    id: 'landRate',
    prompt: 'Estimated land rate?',
    type: 'number',
    field: 'landRatePerSqFt',
    unit: '₹ / sq ft',
    next: (_, a) => a.propertyType === 'Plot/Land' ? 'totalMarketValue' : 'buildingRate',
  },

  buildingRate: {
    id: 'buildingRate',
    prompt: 'Estimated building rate?',
    type: 'number',
    field: 'buildingRatePerSqFt',
    unit: '₹ / sq ft',
    next: 'totalMarketValue',
  },

  totalMarketValue: {
    id: 'totalMarketValue',
    prompt: 'Total market value of the property?',
    type: 'number',
    field: 'totalMarketValue',
    unit: '₹',
    next: null,
  },
}

// All question IDs in rough order — used only for progress %
const ORDERED = [
  'propertyType', 'constructionStage', 'totalFloors', 'bhkType', 'commercialUsage',
  'plotBoundary', 'amenities', 'roadWidth', 'facingDirection', 'totalArea',
  'builtUpArea', 'ageOfConstruction', 'siteObservations', 'frontPhoto',
  'landRate', 'buildingRate', 'totalMarketValue',
]

function pct(qId: string) {
  const i = ORDERED.indexOf(qId)
  return Math.max(5, Math.round(((i + 1) / ORDERED.length) * 100))
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Msg { id: string; role: 'bot' | 'user'; text: string }
function uid() { return Math.random().toString(36).slice(2) }

// ── Page ─────────────────────────────────────────────────────────────────────

export default function InspectPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: raw } = useCase(id)
  const submitField = useSubmitFieldData()
  const uploadPhotos = useUploadCasePhotos()

  const c = (raw as any)?.data ?? raw

  const [msgs, setMsgs] = useState<Msg[]>([])
  const [qId, setQId] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [multiSel, setMultiSel] = useState<string[]>([])
  const [numVal, setNumVal] = useState('')
  const [txtVal, setTxtVal] = useState('')
  const [pendingPhotos, setPendingPhotos] = useState<File[]>([])
  const [started, setStarted] = useState(false)
  const [done, setDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs, qId])

  function bot(text: string) {
    setMsgs(p => [...p, { id: uid(), role: 'bot', text }])
  }
  function me(text: string) {
    setMsgs(p => [...p, { id: uid(), role: 'user', text }])
  }

  function advance(fromId: string, answer: any, display: string) {
    const q = Q[fromId]
    const newAnswers = { ...answers, [q.field]: answer }
    setAnswers(newAnswers)
    me(display)
    setMultiSel([])
    setNumVal('')
    setTxtVal('')

    const nextId = typeof q.next === 'function' ? q.next(answer, newAnswers) : q.next
    if (nextId === null) {
      setQId(null)
      setDone(true)
      setTimeout(() => bot('✅  Inspection complete! Review your answers below and submit when ready.'), 350)
    } else {
      setQId(nextId)
      setTimeout(() => bot(Q[nextId].prompt), 350)
    }
  }

  function start() {
    setStarted(true)
    setQId('propertyType')
    bot(Q.propertyType.prompt)
  }

  async function submit() {
    setSubmitting(true)
    try {
      const numericFields = new Set([
        'totalFloors', 'occupiedFloors', 'totalArea', 'builtUpArea', 'carpetArea',
        'plotArea', 'roadWidth', 'ageOfConstruction', 'landRatePerSqFt',
        'buildingRatePerSqFt', 'totalMarketValue', 'distressValue',
      ])
      const fieldData: Record<string, any> = {}
      for (const [k, v] of Object.entries(answers)) {
        if (k.startsWith('_') || v === '' || v === null || v === undefined) continue
        fieldData[k] = numericFields.has(k) ? Number(v) : v
      }
      await submitField.mutateAsync({ id, ...fieldData })
      if (pendingPhotos.length > 0) {
        await uploadPhotos.mutateAsync({ id, files: pendingPhotos })
      }
      router.push(`/engineer/cases/${id}`)
    } finally {
      setSubmitting(false)
    }
  }

  const curQ = qId ? Q[qId] : null
  const progress = qId ? pct(qId) : done ? 100 : 0

  // ── Summary ──────────────────────────────────────────────────────────────────

  if (done) {
    const entries = Object.entries(answers).filter(([k]) => !k.startsWith('_'))
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="bg-[#075E54] text-white px-4 py-3 flex items-center gap-3 shrink-0">
          <button onClick={() => setDone(false)} className="text-white/70 active:opacity-70">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">Inspection Summary</p>
            <p className="text-xs text-white/60">{c?.caseNumber}</p>
          </div>
          <span className="bg-[#25D366] text-white text-xs font-bold px-2.5 py-0.5 rounded-full shrink-0">
            Complete
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100">
            {entries.map(([k, v]) => (
              <div key={k} className="flex items-start justify-between px-4 py-3 gap-4">
                <span className="text-xs text-gray-500 capitalize shrink-0 pt-0.5">
                  {k.replace(/([A-Z])/g, ' $1').trim()}
                </span>
                <span className="text-sm font-medium text-right text-gray-800 break-words max-w-[60%]">
                  {Array.isArray(v)
                    ? v.length === 0 ? '—' : v.join(', ')
                    : String(v) || '—'}
                </span>
              </div>
            ))}
            {pendingPhotos.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-xs text-gray-500">Photos</span>
                <span className="text-sm font-medium text-gray-800">{pendingPhotos.length} attached</span>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 bg-white border-t shrink-0">
          <button
            onClick={submit}
            disabled={submitting}
            className="w-full bg-[#075E54] active:bg-[#064d45] text-white font-semibold py-4 rounded-2xl text-base disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Submitting…' : 'Submit Inspection →'}
          </button>
        </div>
      </div>
    )
  }

  // ── Chat ─────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col bg-[#E5DDD5]">
      {/* Header */}
      <div className="bg-[#075E54] text-white px-4 py-3 flex items-center gap-3 shrink-0 shadow">
        <Link href={`/engineer/cases/${id}`} className="text-white/70 active:opacity-70">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <div className="w-9 h-9 rounded-full bg-[#128C7E] flex items-center justify-center font-bold text-sm shrink-0">
          AI
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Aplomb Inspector</p>
          <p className="text-xs text-white/60 truncate">
            {c?.caseNumber}
            {c?.propertyAddress ? ` · ${c.propertyAddress.split(',')[0]}` : ''}
          </p>
        </div>
        {started && (
          <span className="text-xs font-semibold text-white/80 shrink-0">{progress}%</span>
        )}
      </div>

      {/* Progress bar */}
      {started && (
        <div className="h-1 bg-black/10 shrink-0">
          <div
            className="h-full bg-[#25D366] transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
        {!started && (
          <div className="space-y-3">
            <div className="bg-white rounded-2xl rounded-tl-none px-4 py-4 shadow-sm max-w-[90%] text-sm text-gray-800 space-y-2 leading-relaxed">
              <p>👋 Let's inspect{' '}
                <strong>{c?.propertyAddress?.split(',')[0] ?? 'this property'}</strong>.
              </p>
              <p>I'll guide you through the inspection step by step. Just tap your answers — no typing needed for most questions.</p>
            </div>
            <button
              onClick={start}
              className="bg-[#25D366] active:bg-[#1ebe57] text-white text-sm font-bold px-8 py-3 rounded-full shadow-md transition-colors"
            >
              Start Inspection ▶
            </button>
          </div>
        )}

        {msgs.map(m => (
          <div key={m.id} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div className={cn(
              'max-w-[82%] px-4 py-2.5 rounded-2xl text-sm shadow-sm leading-relaxed',
              m.role === 'bot'
                ? 'bg-white text-gray-800 rounded-tl-none'
                : 'bg-[#DCF8C6] text-gray-800 rounded-tr-none',
            )}>
              {m.text}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {curQ && (
        <div className="bg-white border-t border-gray-100 shrink-0">
          {curQ.hint && (
            <p className="text-xs text-gray-400 px-4 pt-2.5 pb-0">{curQ.hint}</p>
          )}

          {/* Choice */}
          {curQ.type === 'choice' && (
            <div className="p-3 flex flex-wrap gap-2">
              {curQ.choices?.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => advance(curQ.id, opt.value, opt.label)}
                  className="bg-[#F0F2F5] active:bg-gray-200 text-gray-800 text-sm px-4 py-2.5 rounded-full border border-gray-200 transition-colors"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {/* Multi-select */}
          {curQ.type === 'multi' && (
            <div className="p-3 space-y-2.5">
              <div className="flex flex-wrap gap-2">
                {curQ.choices?.map(opt => {
                  const sel = multiSel.includes(opt.value)
                  return (
                    <button
                      key={opt.value}
                      onClick={() =>
                        setMultiSel(p =>
                          p.includes(opt.value) ? p.filter(v => v !== opt.value) : [...p, opt.value],
                        )
                      }
                      className={cn(
                        'text-sm px-4 py-2 rounded-full border transition-colors',
                        sel
                          ? 'bg-[#075E54] text-white border-[#075E54]'
                          : 'bg-[#F0F2F5] text-gray-800 border-gray-200',
                      )}
                    >
                      {sel && '✓ '}{opt.label}
                    </button>
                  )
                })}
              </div>
              <button
                onClick={() => {
                  const label = multiSel.length === 0 ? 'None' : multiSel.join(', ')
                  advance(curQ.id, multiSel, label)
                }}
                className="w-full bg-[#075E54] active:bg-[#064d45] text-white py-3 rounded-xl text-sm font-semibold transition-colors"
              >
                Done →
              </button>
            </div>
          )}

          {/* Number */}
          {curQ.type === 'number' && (
            <div className="p-3 flex items-center gap-2">
              <div className="flex-1 relative">
                <input
                  type="number"
                  inputMode="decimal"
                  value={numVal}
                  onChange={e => setNumVal(e.target.value)}
                  placeholder={`Enter value…`}
                  onKeyDown={e =>
                    e.key === 'Enter' && numVal &&
                    advance(curQ.id, numVal, `${numVal} ${curQ.unit ?? ''}`.trim())
                  }
                  className="w-full bg-[#F0F2F5] rounded-full px-4 py-2.5 pr-20 text-sm outline-none"
                  autoFocus
                />
                {curQ.unit && (
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
                    {curQ.unit}
                  </span>
                )}
              </div>
              <button
                onClick={() =>
                  numVal && advance(curQ.id, numVal, `${numVal} ${curQ.unit ?? ''}`.trim())
                }
                disabled={!numVal}
                className="w-10 h-10 bg-[#075E54] rounded-full flex items-center justify-center disabled:opacity-40 shrink-0 active:bg-[#064d45] transition-colors"
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
          )}

          {/* Text */}
          {curQ.type === 'text' && (
            <div className="p-3 flex items-end gap-2">
              <textarea
                value={txtVal}
                onChange={e => setTxtVal(e.target.value)}
                placeholder="Type here…"
                rows={2}
                className="flex-1 bg-[#F0F2F5] rounded-2xl px-4 py-2.5 text-sm outline-none resize-none"
              />
              <div className="flex flex-col gap-1 shrink-0">
                <button
                  onClick={() => txtVal && advance(curQ.id, txtVal, txtVal)}
                  disabled={!txtVal}
                  className="w-10 h-10 bg-[#075E54] rounded-full flex items-center justify-center disabled:opacity-40 active:bg-[#064d45] transition-colors"
                >
                  <Send className="w-4 h-4 text-white" />
                </button>
                {curQ.skippable && (
                  <button
                    onClick={() => advance(curQ.id, '', 'Skipped')}
                    className="w-10 h-7 flex items-center justify-center text-[10px] text-gray-400"
                  >
                    skip
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Photo */}
          {curQ.type === 'photo' && (
            <div className="p-3 space-y-2">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (fileRef.current) {
                      fileRef.current.setAttribute('capture', 'environment')
                      fileRef.current.click()
                    }
                  }}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#075E54] active:bg-[#064d45] text-white py-3 rounded-xl text-sm font-medium transition-colors"
                >
                  <Camera className="w-4 h-4" /> Camera
                </button>
                <button
                  onClick={() => {
                    if (fileRef.current) {
                      fileRef.current.removeAttribute('capture')
                      fileRef.current.click()
                    }
                  }}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#F0F2F5] active:bg-gray-200 text-gray-700 py-3 rounded-xl text-sm font-medium border border-gray-200 transition-colors"
                >
                  <ImageIcon className="w-4 h-4" /> Gallery
                </button>
              </div>
              {curQ.skippable && (
                <button
                  onClick={() => advance(curQ.id, null, 'Photo skipped')}
                  className="w-full text-xs text-gray-400 py-1"
                >
                  Skip for now
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (file) {
                    setPendingPhotos(p => [...p, file])
                    advance(curQ.id, file.name, '📷  Photo captured')
                  }
                  e.target.value = ''
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
