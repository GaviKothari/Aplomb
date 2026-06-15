'use client'

import { AppLayout } from '@/components/layout/app-layout'
import { ChatContainer } from '@/components/ai-chat/chat-container'

export default function ReportingAssistantPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Reporting Assistant</h1>
          <p className="text-muted-foreground mt-2">Generate comprehensive property valuation reports using conversational AI</p>
        </div>

        <ChatContainer />
      </div>
    </AppLayout>
  )
}

