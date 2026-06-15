'use client'

import { AppLayout } from '@/components/layout/app-layout'
import { KanbanBoard } from '@/components/kanban/kanban-board'
import { mockCases } from '@/lib/mock-data'

export default function KanbanPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Case Kanban Board</h1>
          <p className="text-muted-foreground mt-2">Drag and drop cases to update their status</p>
        </div>

        {/* Kanban board */}
        <div className="border border-border rounded-lg p-4 bg-card">
          <KanbanBoard cases={mockCases} />
        </div>
      </div>
    </AppLayout>
  )
}
