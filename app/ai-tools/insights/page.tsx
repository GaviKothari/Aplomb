'use client'

import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Zap,
  TrendingUp,
  AlertCircle,
  Lightbulb,
  Clock,
  Users,
  Target,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'

// Mock AI insights data
const performanceInsights = [
  {
    title: 'Team Productivity Peak',
    description: 'Engineer productivity is highest on Tuesdays and Wednesdays (avg 22 cases/week)',
    impact: '+15% efficiency',
    icon: TrendingUp,
    color: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800',
  },
  {
    title: 'Bottleneck Detected',
    description: 'Verification stage takes 35% longer than optimal. Consider adding 2 more verifiers.',
    impact: '-8 days TAT',
    icon: AlertCircle,
    color: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800',
  },
  {
    title: 'Cost Optimization',
    description: 'Current fuel costs can be reduced by routing optimization (₹45K/month savings)',
    impact: '12% savings',
    icon: Lightbulb,
    color: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800',
  },
  {
    title: 'Resource Allocation',
    description: 'Recommend transferring Raj Kumar to high-priority cases (shows 92% accuracy rate)',
    impact: '+18% accuracy',
    icon: Users,
    color: 'bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800',
  },
]

const engineerPerformance = [
  { name: 'Raj Kumar', accuracy: '92%', speed: '88%', efficiency: '90%' },
  { name: 'Priya Singh', accuracy: '88%', speed: '92%', efficiency: '85%' },
  { name: 'Amit Patel', accuracy: '90%', speed: '85%', efficiency: '88%' },
  { name: 'Neha Sharma', accuracy: '87%', speed: '89%', efficiency: '91%' },
]

const recommendationsData = [
  {
    category: 'Immediate',
    icon: AlertTriangle,
    color: 'text-red-600',
    items: [
      'Expedite verification for CASE-145 (critical client)',
      'Increase travel budget allocation by 15% for Q2',
      'Schedule equipment maintenance on weekend',
    ],
  },
  {
    category: 'Short-term (1-2 weeks)',
    icon: Clock,
    color: 'text-amber-600',
    items: [
      'Implement route optimization for fuel savings',
      'Train 2 new verifiers on complex cases',
      'Review and update pricing for next batch',
    ],
  },
  {
    category: 'Long-term (1-3 months)',
    icon: Target,
    color: 'text-blue-600',
    items: [
      'Consider hiring 3 more engineers for workload',
      'Implement automated report generation',
      'Develop predictive model for case complexity',
    ],
  },
]

export default function InsightsPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Analytics & Insights</h1>
          <p className="text-muted-foreground mt-2">
            Machine learning-powered analysis of operations, performance, and optimization recommendations
          </p>
        </div>

        {/* Key Insights Cards */}
        <div className="grid gap-4 md:grid-cols-2">
          {performanceInsights.map((insight) => {
            const Icon = insight.icon
            return (
              <Card key={insight.title} className={`border-l-4 ${insight.color} transition-all hover:shadow-md`}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                      <Icon className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm mb-1">{insight.title}</p>
                      <p className="text-xs text-muted-foreground mb-3">{insight.description}</p>
                      <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300 text-xs">
                        {insight.impact}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              Engineer Performance Scores
            </CardTitle>
            <CardDescription>AI-computed efficiency metrics for each team member</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold">Engineer Name</th>
                    <th className="text-center py-3 px-4 font-semibold">Accuracy</th>
                    <th className="text-center py-3 px-4 font-semibold">Speed</th>
                    <th className="text-center py-3 px-4 font-semibold">Efficiency</th>
                  </tr>
                </thead>
                <tbody>
                  {engineerPerformance.map((engineer) => (
                    <tr key={engineer.name} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-4 font-medium">{engineer.name}</td>
                      <td className="py-3 px-4 text-center">
                        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                          {engineer.accuracy}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300">
                          {engineer.speed}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
                          {engineer.efficiency}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Actionable Recommendations */}
        <div className="grid gap-6 md:grid-cols-3">
          {recommendationsData.map((section) => {
            const Icon = section.icon
            return (
              <Card key={section.category} className="border-l-4 border-l-blue-500">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${section.color}`} />
                    {section.category}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {section.items.map((item, idx) => (
                      <li key={idx} className="flex gap-3 text-sm">
                        <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">•</span>
                        <span className="text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Summary Statistics */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-l-4 border-l-blue-600">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-600" />
              AI Analysis Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Model Accuracy</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">96.2%</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Potential Revenue Impact</p>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">₹12.5L/month</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Recommendations</p>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">23 Active</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-6">
              Last updated: {new Date().toLocaleString()} • Models trained on 90 days of operational data
            </p>
          </CardContent>
        </Card>

        {/* Success Rate Metrics */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                High Priority Cases
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">94%</p>
              <p className="text-xs text-muted-foreground mt-2">Success Rate</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Medium Priority Cases
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">89%</p>
              <p className="text-xs text-muted-foreground mt-2">Success Rate</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                Low Priority Cases
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-amber-700 dark:text-amber-300">82%</p>
              <p className="text-xs text-muted-foreground mt-2">Success Rate</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}
