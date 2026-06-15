'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EnhancedFormField } from '@/components/forms/enhanced-form-field'
import { InteractiveButton } from '@/components/buttons/interactive-button'
import { animatedToast } from '@/components/notifications/animated-toast'
import { PageTransition } from '@/components/layout/page-transition'

export function InteractionsShowcase() {
  const [formData, setFormData] = useState({ name: '', email: '' })
  const [buttonState, setButtonState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  const handleFormChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    setButtonState('loading')
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setButtonState('success')
    animatedToast.success('Form submitted successfully!', 'Your data has been saved.')
    setTimeout(() => setButtonState('idle'), 2000)
  }

  const handleError = async () => {
    setButtonState('loading')
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setButtonState('error')
    animatedToast.error('Something went wrong', 'Please try again later.')
    setTimeout(() => setButtonState('idle'), 2000)
  }

  return (
    <PageTransition className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Interaction Showcase</h1>
        <p className="text-muted-foreground">Explore smooth transitions, animations, and enhanced interactions</p>
      </div>

      {/* Form Example */}
      <Card className="border border-border/50 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle>Enhanced Form with Floating Labels</CardTitle>
          <CardDescription>Try typing to see smooth label animations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <EnhancedFormField
            label="Full Name"
            name="name"
            placeholder="Enter your name"
            value={formData.name}
            onChange={(value) => handleFormChange('name', value)}
            required
          />
          <EnhancedFormField
            label="Email Address"
            name="email"
            type="email"
            placeholder="your@email.com"
            description="We'll never share your email"
            value={formData.email}
            onChange={(value) => handleFormChange('email', value)}
            required
          />
        </CardContent>
      </Card>

      {/* Interactive Buttons */}
      <Card className="border border-border/50 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle>Interactive Buttons</CardTitle>
          <CardDescription>Click to see loading, success, and error states</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 flex-wrap">
            <InteractiveButton state={buttonState} onClick={handleSubmit}>
              Submit Form
            </InteractiveButton>
            <InteractiveButton state={buttonState} variant="outline" onClick={handleError}>
              Trigger Error
            </InteractiveButton>
            <Button variant="secondary" onClick={() => animatedToast.info('Info', 'This is an info toast')}>
              Show Info Toast
            </Button>
            <Button variant="secondary" onClick={() => animatedToast.warning('Warning', 'Please proceed carefully')}>
              Show Warning Toast
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Animation Examples */}
      <Card className="border border-border/50 shadow-sm hover:shadow-md transition-shadow stagger-item animate-in fade-in slide-in-from-bottom-4">
        <CardHeader>
          <CardTitle>Smooth Animations</CardTitle>
          <CardDescription>Cards and elements animate in on page load</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            All interactive elements feature smooth transitions, hover effects, and professional micro-interactions designed for enterprise applications.
          </p>
        </CardContent>
      </Card>
    </PageTransition>
  )
}
