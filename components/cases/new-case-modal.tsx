'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CheckCircle2, AlertCircle, ChevronRight, MapPin } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface NewCaseModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (caseData: any) => void
}

const STEPS = [
  'Bank & Info',
  'Property',
  'Owner',
  'Auto Check',
  'Team',
  'Documents',
  'Review',
]

const BANKS = ['HDFC Bank', 'ICICI Bank', 'SBI', 'Axis Bank', 'Kotak Bank', 'Yes Bank']
const CASE_TYPES = ['Residential', 'Commercial', 'Land', 'Mixed']
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical']
const PROPERTY_TYPES = ['Flat', 'House', 'Plot', 'Shop', 'Office', 'Warehouse']
const ENGINEERS = ['Raj Kumar', 'Priya Singh', 'Amit Patel', 'Neha Sharma', 'Rohan Singh']
const VERIFIERS = ['Mohit Sharma', 'Deepak Kumar', 'Anjali Verma', 'Vikram Singh']

export function NewCaseModal({ isOpen, onClose, onCreate }: NewCaseModalProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState({
    bank: '',
    caseType: '',
    priority: 'Medium',
    referenceNumber: '',
    propertyAddress: '',
    city: '',
    pincode: '',
    propertyType: '',
    area: '',
    ownerName: '',
    contactNumber: '',
    alternateContact: '',
    engineer: '',
    verifier: '',
    documents: null,
  })

  const [autoCheckResults, setAutoCheckResults] = useState({
    duplicateFound: false,
    demolitionAlert: false,
    previousValuation: true,
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleAutoCheck = () => {
    // Simulate API call for duplicate and demolition checks
    setAutoCheckResults({
      duplicateFound: Math.random() > 0.7,
      demolitionAlert: Math.random() > 0.8,
      previousValuation: Math.random() > 0.4,
    })
  }

  const handleNext = () => {
    if (currentStep === 3) {
      handleAutoCheck()
    }
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleCreate = () => {
    onCreate(formData)
    onClose()
    setCurrentStep(0)
    setFormData({
      bank: '',
      caseType: '',
      priority: 'Medium',
      referenceNumber: '',
      propertyAddress: '',
      city: '',
      pincode: '',
      propertyType: '',
      area: '',
      ownerName: '',
      contactNumber: '',
      alternateContact: '',
      engineer: '',
      verifier: '',
      documents: null,
    })
  }

  const isStepValid = () => {
    switch (currentStep) {
      case 0:
        return formData.bank && formData.caseType && formData.priority
      case 1:
        return formData.propertyAddress && formData.city && formData.pincode
      case 2:
        return formData.ownerName && formData.contactNumber
      case 3:
        return true
      case 4:
        return formData.engineer && formData.verifier
      case 5:
        return true
      case 6:
        return true
      default:
        return false
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Case</DialogTitle>
          <DialogDescription>Step {currentStep + 1} of {STEPS.length}: {STEPS[currentStep]}</DialogDescription>
        </DialogHeader>

        {/* Progress bar */}
        <div className="space-y-4">
          <div className="flex gap-2">
            {STEPS.map((step, idx) => (
              <div key={idx} className="flex-1">
                <div
                  className={`h-2 rounded-full transition-all ${
                    idx <= currentStep ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                />
              </div>
            ))}
          </div>

          {/* Step indicators */}
          <div className="flex gap-2 overflow-x-auto">
            {STEPS.map((step, idx) => (
              <Button
                key={idx}
                variant={idx === currentStep ? 'default' : idx < currentStep ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => idx <= currentStep && setCurrentStep(idx)}
                className="whitespace-nowrap"
              >
                {idx + 1}. {step}
              </Button>
            ))}
          </div>
        </div>

        {/* Step 1: Bank & Basic Info */}
        {currentStep === 0 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="bank">Bank Name *</Label>
              <Select value={formData.bank} onValueChange={(val) => handleInputChange('bank', val)}>
                <SelectTrigger id="bank">
                  <SelectValue placeholder="Select bank" />
                </SelectTrigger>
                <SelectContent>
                  {BANKS.map((bank) => (
                    <SelectItem key={bank} value={bank}>
                      {bank}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="caseType">Case Type *</Label>
                <Select value={formData.caseType} onValueChange={(val) => handleInputChange('caseType', val)}>
                  <SelectTrigger id="caseType">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {CASE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="priority">Priority *</Label>
                <Select value={formData.priority} onValueChange={(val) => handleInputChange('priority', val)}>
                  <SelectTrigger id="priority">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="reference">Reference Number (Optional)</Label>
              <Input
                id="reference"
                placeholder="Enter reference number"
                value={formData.referenceNumber}
                onChange={(e) => handleInputChange('referenceNumber', e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Step 2: Property Details */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="address">Property Address *</Label>
              <Input
                id="address"
                placeholder="Enter property address"
                value={formData.propertyAddress}
                onChange={(e) => handleInputChange('propertyAddress', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  placeholder="Enter city"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="pincode">Pincode *</Label>
                <Input
                  id="pincode"
                  placeholder="Enter pincode"
                  value={formData.pincode}
                  onChange={(e) => handleInputChange('pincode', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="propType">Property Type *</Label>
                <Select value={formData.propertyType} onValueChange={(val) => handleInputChange('propertyType', val)}>
                  <SelectTrigger id="propType">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPERTY_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="area">Area (sq ft)</Label>
                <Input
                  id="area"
                  placeholder="Enter area"
                  value={formData.area}
                  onChange={(e) => handleInputChange('area', e.target.value)}
                />
              </div>
            </div>

            <Button variant="outline" className="w-full gap-2">
              <MapPin className="w-4 h-4" />
              Pin Location on Map
            </Button>
          </div>
        )}

        {/* Step 3: Owner & Contact */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="owner">Owner Name *</Label>
              <Input
                id="owner"
                placeholder="Enter owner name"
                value={formData.ownerName}
                onChange={(e) => handleInputChange('ownerName', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="contact">Contact Number *</Label>
              <Input
                id="contact"
                placeholder="Enter contact number"
                value={formData.contactNumber}
                onChange={(e) => handleInputChange('contactNumber', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="altContact">Alternate Contact (Optional)</Label>
              <Input
                id="altContact"
                placeholder="Enter alternate contact"
                value={formData.alternateContact}
                onChange={(e) => handleInputChange('alternateContact', e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Step 4: Auto Check */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span className="text-sm font-medium">No duplicate property found</span>
                  </div>

                  {autoCheckResults.demolitionAlert ? (
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                      <span className="text-sm font-medium">⚠️ Property on demolition list</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <span className="text-sm font-medium">No demolition alerts</span>
                    </div>
                  )}

                  {autoCheckResults.previousValuation && (
                    <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 mt-4">
                      <p className="text-sm font-medium text-amber-900 dark:text-amber-300">📊 Previous valuation found</p>
                      <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">Last valuation: March 2023 - ₹45L</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <p className="text-sm text-muted-foreground">System checks completed. You can proceed to assign team.</p>
          </div>
        )}

        {/* Step 5: Assign Team */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="engineer">Assign Engineer *</Label>
              <Select value={formData.engineer} onValueChange={(val) => handleInputChange('engineer', val)}>
                <SelectTrigger id="engineer">
                  <SelectValue placeholder="Select engineer" />
                </SelectTrigger>
                <SelectContent>
                  {ENGINEERS.map((eng) => (
                    <SelectItem key={eng} value={eng}>
                      {eng}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="verifier">Assign Verifier *</Label>
              <Select value={formData.verifier} onValueChange={(val) => handleInputChange('verifier', val)}>
                <SelectTrigger id="verifier">
                  <SelectValue placeholder="Select verifier" />
                </SelectTrigger>
                <SelectContent>
                  {VERIFIERS.map((ver) => (
                    <SelectItem key={ver} value={ver}>
                      {ver}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button variant="outline" className="w-full">
              Auto Assign (Based on workload & location)
            </Button>
          </div>
        )}

        {/* Step 6: Upload Documents */}
        {currentStep === 5 && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-colors cursor-pointer">
              <p className="text-sm font-medium">Drag & drop documents here</p>
              <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
              <p className="text-xs text-muted-foreground">PDF, Word, Excel supported</p>
            </div>

            <Button variant="outline" className="w-full">
              AI Extract Data from Documents
            </Button>

            <p className="text-sm text-muted-foreground text-center">Document upload is optional</p>
          </div>
        )}

        {/* Step 7: Review & Create */}
        {currentStep === 6 && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bank</span>
                  <span className="font-medium">{formData.bank}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Property</span>
                  <span className="font-medium">{formData.propertyAddress}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Owner</span>
                  <span className="font-medium">{formData.ownerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Engineer</span>
                  <span className="font-medium">{formData.engineer}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Verifier</span>
                  <span className="font-medium">{formData.verifier}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Priority</span>
                  <Badge
                    className={
                      formData.priority === 'Critical'
                        ? 'bg-red-100 text-red-800'
                        : formData.priority === 'High'
                        ? 'bg-orange-100 text-orange-800'
                        : formData.priority === 'Medium'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                    }
                  >
                    {formData.priority}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            Previous
          </Button>

          <div className="flex gap-2">
            {currentStep === STEPS.length - 1 ? (
              <>
                <Button variant="outline" onClick={onClose}>
                  Save as Draft
                </Button>
                <Button onClick={handleCreate} disabled={!isStepValid()}>
                  Create Case
                </Button>
              </>
            ) : (
              <Button onClick={handleNext} disabled={!isStepValid()} className="gap-2">
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
