'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, Trash2 } from 'lucide-react'
import { MessageBubble } from './message-bubble'
import { ChatInput } from './chat-input'
import { SuggestedPrompts } from './suggested-prompts'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  content: string
  isUser: boolean
  timestamp: Date
  status?: 'sending' | 'sent' | 'delivered'
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: '1',
    content: 'Hello! I\'m your AI reporting assistant. I can help you generate comprehensive property valuation reports by breaking down the process into manageable sections. What would you like to work on today?',
    isUser: false,
    timestamp: new Date(Date.now() - 60000),
    status: 'delivered'
  }
]

export function ChatContainer() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES)
  const [isLoading, setIsLoading] = useState(false)
  const [messagesEndRef, setMessagesEndRef] = useState<HTMLDivElement | null>(null)

  const scrollToBottom = () => {
    messagesEndRef?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      isUser: true,
      timestamp: new Date(),
      status: 'sending'
    }

    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)

    // Simulate AI response delay
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: generateMockResponse(content),
        isUser: false,
        timestamp: new Date(),
        status: 'delivered'
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === userMessage.id ? { ...msg, status: 'delivered' } : msg
        )
      )
      setMessages((prev) => [...prev, assistantMessage])
      setIsLoading(false)
    }, 1500)
  }

  const handleClearChat = () => {
    setMessages(INITIAL_MESSAGES)
  }

  const handleExportReport = () => {
    const reportContent = messages
      .filter((m) => !m.isUser)
      .map((m) => m.content)
      .join('\n\n---\n\n')

    const element = document.createElement('a')
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(reportContent))
    element.setAttribute('download', 'property-valuation-report.txt')
    element.style.display = 'none'
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  return (
    <Card className="border border-border/50 shadow-sm overflow-hidden flex flex-col h-[600px] lg:h-[700px]">
      {/* Header */}
      <div className="border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent p-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">AI Report Generator</h3>
          <p className="text-xs text-muted-foreground">Interactive assistant for property valuations</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExportReport}
            className="gap-2 hover:bg-primary/10"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearChat}
            className="gap-2 hover:bg-destructive/10"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Clear</span>
          </Button>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            content={message.content}
            isUser={message.isUser}
            timestamp={message.timestamp}
            status={message.status}
          />
        ))}

        {isLoading && (
          <div className="flex gap-3 justify-start animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-semibold text-primary">AI</span>
            </div>
            <div className="bg-secondary text-secondary-foreground rounded-lg rounded-bl-none px-4 py-3 border border-border/50">
              <div className="flex gap-1 items-center">
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={setMessagesEndRef} />
      </div>

      {/* Suggested Prompts or Chat Input */}
      <div className="border-t border-border/50 p-4 bg-background/50 backdrop-blur-sm">
        {messages.length <= 1 ? (
          <SuggestedPrompts onSelect={handleSendMessage} />
        ) : (
          <ChatInput onSend={handleSendMessage} disabled={isLoading} />
        )}
      </div>

      {/* Chat Input (always visible below suggestions) */}
      {messages.length > 1 && <ChatInput onSend={handleSendMessage} disabled={isLoading} />}
    </Card>
  )
}

function generateMockResponse(input: string): string {
  const responses: { [key: string]: string } = {
    property: 'Based on the property details provided, here\'s a comprehensive overview:\n\nProperty Type: Residential Apartment\nLocation: Prime Business District\nArea: 2,500 sq ft\nCondition: Good\n\nThe property shows strong fundamentals with excellent location advantages. The market comparables in the area suggest a valuation range of ₹45-50 lakhs.',
    market: 'Market Analysis for Residential Properties:\n\nCurrent market conditions are favorable with appreciation of 8-10% annually. Similar properties in the area are selling at ₹18,000-20,000 per sq ft. The rental yield is approximately 4-5% p.a., making this a good investment opportunity.',
    valuation: 'Final Valuation Summary:\n\nApproach Used: Comparative Market Analysis\nFinal Appraised Value: ₹48,75,000\n\nThis valuation is based on:\n- Comparable sales analysis\n- Market trends and conditions\n- Property condition assessment\n- Location premium\n\nValidity: Valid for 6 months from the date of inspection.',
    site: 'Site Conditions Report:\n\nProperty Dimensions: 50ft x 50ft\nConstruction Quality: Good\nAge: 8 years\nStructural Condition: Sound\n\nPhotography: All key areas documented\nNo major defects observed\nMaintenance: Well-maintained\n\nRecommendation: Property is ready for immediate occupancy/use.',
    default: 'I\'ve processed your request. Here are some recommendations:\n\n1. Include detailed property measurements\n2. Provide comparable property data\n3. Document any recent renovations\n4. Note market trends\n\nWould you like me to elaborate on any specific section?'
  }

  const input_lower = input.toLowerCase()
  for (const [key, response] of Object.entries(responses)) {
    if (input_lower.includes(key)) {
      return response
    }
  }
  return responses.default
}
