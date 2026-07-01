'use client'

import { usePropertyIntelligence, useIndexPropertyIntelligence } from '@/lib/api/hooks'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Building2, MapPin, TrendingUp, RefreshCw, Loader2,
  CheckCircle2, AlertCircle, BarChart3, Home
} from 'lucide-react'

interface Props {
  caseId: string
}

function fmt(n: number | null | undefined, prefix = '₹') {
  if (n == null) return '—'
  if (n >= 10_00_000) return `${prefix}${(n / 10_00_000).toFixed(2)}L`
  if (n >= 1_000) return `${prefix}${(n / 1_000).toFixed(1)}K`
  return `${prefix}${n.toLocaleString('en-IN')}`
}

function MatchCard({ match, label }: { match: any; label: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-gray-900 leading-snug line-clamp-2">
          {match.rawAddress}
        </p>
        <Badge variant="outline" className="shrink-0 text-xs">{label}</Badge>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600">
        {match.ratePerSqFt != null && (
          <span>Rate: <strong className="text-gray-900">{fmt(match.ratePerSqFt)}/sqft</strong></span>
        )}
        {match.totalMarketValue != null && (
          <span>Value: <strong className="text-gray-900">{fmt(match.totalMarketValue)}</strong></span>
        )}
        {match.totalArea != null && (
          <span>Area: <strong className="text-gray-900">{match.totalArea} sqft</strong></span>
        )}
        {match.bankName && (
          <span>Bank: <strong className="text-gray-900">{match.bankName}</strong></span>
        )}
        {match.reportDate && (
          <span>Valued: <strong className="text-gray-900">{new Date(match.reportDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</strong></span>
        )}
        {match.distanceM != null && (
          <span>Distance: <strong className="text-gray-900">{match.distanceM < 1000 ? `${Math.round(match.distanceM)}m` : `${(match.distanceM / 1000).toFixed(2)}km`}</strong></span>
        )}
      </div>
      {match.siteObservations && (
        <p className="text-xs text-gray-500 italic line-clamp-2">"{match.siteObservations}"</p>
      )}
    </div>
  )
}

function SectionHeader({ icon: Icon, title, count }: { icon: any; title: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-4 h-4 text-blue-600 shrink-0" />
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      {count != null && (
        <span className="ml-auto text-xs bg-blue-100 text-blue-700 rounded-full px-2 py-0.5">{count}</span>
      )}
    </div>
  )
}

export function PropertyIntelligencePanel({ caseId }: Props) {
  const { data, isLoading, error, refetch } = usePropertyIntelligence(caseId)
  const indexMutation = useIndexPropertyIntelligence()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
        <p className="text-sm text-gray-600">
          No property intelligence data yet for this case.
        </p>
        <Button
          size="sm"
          variant="outline"
          disabled={indexMutation.isPending}
          onClick={() => indexMutation.mutate(caseId, { onSuccess: () => refetch() })}
        >
          {indexMutation.isPending
            ? <><Loader2 className="w-3 h-3 mr-2 animate-spin" />Indexing…</>
            : <><RefreshCw className="w-3 h-3 mr-2" />Index This Property</>
          }
        </Button>
      </div>
    )
  }

  const intel = data as any
  const { exactMatch, sameBuilding, nearby100m, nearby250m, nearby500m, rateTrend, summary } = intel

  const allNearby = [
    ...(nearby100m ?? []).map((m: any) => ({ ...m, _bucket: '≤100m' })),
    ...(nearby250m ?? []).filter((m: any) => !(nearby100m ?? []).find((n: any) => n.id === m.id)).map((m: any) => ({ ...m, _bucket: '≤250m' })),
    ...(nearby500m ?? []).filter((m: any) => !(nearby250m ?? []).find((n: any) => n.id === m.id)).map((m: any) => ({ ...m, _bucket: '≤500m' })),
  ]

  const avgRateSameBuilding = sameBuilding?.avgRate
    ? Math.round(sameBuilding.avgRate)
    : null

  return (
    <div className="space-y-6">
      {/* Summary strip */}
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-semibold text-blue-900">Intelligence Summary</span>
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto h-7 text-xs text-blue-700 hover:text-blue-900"
            disabled={indexMutation.isPending}
            onClick={() => indexMutation.mutate(caseId, { onSuccess: () => refetch() })}
          >
            {indexMutation.isPending
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : <RefreshCw className="w-3 h-3" />
            }
          </Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-blue-700">Exact Match</p>
            <p className="font-bold text-blue-900 flex items-center gap-1">
              {summary?.hasExactMatch
                ? <><CheckCircle2 className="w-3 h-3 text-green-600" /> Found</>
                : 'None'}
            </p>
          </div>
          <div>
            <p className="text-xs text-blue-700">Same Building</p>
            <p className="font-bold text-blue-900">{summary?.sameBuildingCount ?? 0} records</p>
          </div>
          <div>
            <p className="text-xs text-blue-700">Nearby ≤500m</p>
            <p className="font-bold text-blue-900">{summary?.nearbyCount ?? 0} comps</p>
          </div>
          <div>
            <p className="text-xs text-blue-700">Locality Avg Rate</p>
            <p className="font-bold text-blue-900">
              {summary?.avgRateLocality ? `${fmt(summary.avgRateLocality)}/sqft` : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Exact match */}
      {exactMatch && (
        <div>
          <SectionHeader icon={CheckCircle2} title="Exact Match — Same Property" />
          <MatchCard match={exactMatch} label="Exact" />
        </div>
      )}

      {/* Same building */}
      {sameBuilding && sameBuilding.count > 0 && (
        <div>
          <SectionHeader icon={Building2} title="Same Building / Society" count={sameBuilding.count} />
          {avgRateSameBuilding != null && (
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="rounded-lg bg-green-50 border border-green-100 p-3 text-center">
                <p className="text-xs text-green-700">Avg Rate</p>
                <p className="font-bold text-green-900 text-sm">{fmt(avgRateSameBuilding)}/sqft</p>
              </div>
              <div className="rounded-lg bg-gray-50 border border-gray-100 p-3 text-center">
                <p className="text-xs text-gray-600">Min Rate</p>
                <p className="font-bold text-gray-900 text-sm">{fmt(sameBuilding.minRate)}/sqft</p>
              </div>
              <div className="rounded-lg bg-gray-50 border border-gray-100 p-3 text-center">
                <p className="text-xs text-gray-600">Max Rate</p>
                <p className="font-bold text-gray-900 text-sm">{fmt(sameBuilding.maxRate)}/sqft</p>
              </div>
            </div>
          )}
          <div className="space-y-2">
            {(sameBuilding.records ?? []).slice(0, 5).map((m: any) => (
              <MatchCard key={m.id} match={m} label="Building" />
            ))}
            {sameBuilding.count > 5 && (
              <p className="text-xs text-gray-400 text-center pt-1">
                +{sameBuilding.count - 5} more records in this society
              </p>
            )}
          </div>
        </div>
      )}

      {/* Nearby properties */}
      {allNearby.length > 0 && (
        <div>
          <SectionHeader icon={MapPin} title="Comparable Properties Nearby" count={allNearby.length} />
          <div className="space-y-2">
            {allNearby.map((m: any) => (
              <MatchCard key={`${m.id}-${m._bucket}`} match={m} label={m._bucket} />
            ))}
          </div>
        </div>
      )}

      {/* Rate trend */}
      {rateTrend && rateTrend.length > 0 && (
        <div>
          <SectionHeader icon={TrendingUp} title="Rate Trend by Year (Locality)" />
          <div className="rounded-xl border border-gray-200 bg-white p-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-100">
                  <th className="text-left pb-2 font-medium">Year</th>
                  <th className="text-right pb-2 font-medium">Avg Rate/sqft</th>
                  <th className="text-right pb-2 font-medium">Cases</th>
                  <th className="text-right pb-2 font-medium">YoY Change</th>
                </tr>
              </thead>
              <tbody>
                {(rateTrend as any[]).map((row, i) => {
                  const prev = i < rateTrend.length - 1 ? rateTrend[i + 1] : null
                  const change = prev ? ((row.avgRate - prev.avgRate) / prev.avgRate) * 100 : null
                  return (
                    <tr key={row.year} className="border-b border-gray-50 last:border-0">
                      <td className="py-2 font-medium text-gray-900">{row.year}</td>
                      <td className="py-2 text-right text-gray-900">{fmt(Math.round(row.avgRate))}/sqft</td>
                      <td className="py-2 text-right text-gray-500">{row.count}</td>
                      <td className="py-2 text-right">
                        {change != null ? (
                          <span className={change >= 0 ? 'text-green-600' : 'text-red-500'}>
                            {change >= 0 ? '+' : ''}{change.toFixed(1)}%
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state if nothing at all */}
      {!exactMatch && (!sameBuilding || sameBuilding.count === 0) && allNearby.length === 0 && rateTrend?.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <Home className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No comparable properties found in the knowledge base yet.</p>
          <p className="text-xs text-gray-400 mt-1">Comparables build up as more cases are finalized in this area.</p>
        </div>
      )}
    </div>
  )
}
