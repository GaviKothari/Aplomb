'use client'

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronDown } from 'lucide-react'

interface InteractiveChartProps {
  title: string
  subtitle?: string
  data: any[]
  type?: 'line' | 'bar'
  dataKey?: string
  onDrillDown?: () => void
}

export function InteractiveChart({ title, subtitle, data, type = 'line', dataKey = 'value', onDrillDown }: InteractiveChartProps) {
  const ChartComponent = type === 'line' ? LineChart : BarChart

  return (
    <Card className="border border-border/50 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold text-foreground">{title}</CardTitle>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          {onDrillDown && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDrillDown}
              className="gap-1 hover:bg-primary/10"
            >
              <span className="text-xs">Drill Down</span>
              <ChevronDown className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <ChartComponent data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="rgb(59, 130, 246)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="rgb(59, 130, 246)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 4" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="name" stroke="var(--muted-foreground)" style={{ fontSize: '12px' }} />
            <YAxis stroke="var(--muted-foreground)" style={{ fontSize: '12px' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
              }}
            />
            {type === 'line' ? (
              <Line
                type="monotone"
                dataKey={dataKey}
                stroke="rgb(59, 130, 246)"
                strokeWidth={3}
                dot={{ fill: 'rgb(59, 130, 246)', r: 5 }}
                activeDot={{ r: 7 }}
              />
            ) : (
              <Bar dataKey={dataKey} fill="url(#colorGradient)" radius={[8, 8, 4, 4]} />
            )}
            <Legend />
          </ChartComponent>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
