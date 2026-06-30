'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  useCreateEmployee, useUpdateEmployee,
  useEmployeeDocuments, useUploadEmployeeDocument, useDeleteEmployeeDocument,
} from '@/lib/api/hooks'
import {
  User, Briefcase, FileText, Upload, Trash2, CheckCircle2, Loader2,
  AlertCircle, Eye, IndianRupee, Phone, Mail, Building2, Calendar, MailCheck, MailWarning,
} from 'lucide-react'

// ── Constants ──────────────────────────────────────────────────────────────────
const DEPARTMENTS = [
  'Field Survey', 'Operations', 'Quality & Verification',
  'Finance & Accounts', 'Human Resources', 'Management', 'IT',
]
const ROLES = [
  { value: 'ENGINEER',    label: 'Field Engineer' },
  { value: 'COORDINATOR', label: 'Coordinator' },
  { value: 'VERIFIER',    label: 'Verifier' },
  { value: 'ACCOUNTS',    label: 'Accounts' },
  { value: 'HR',          label: 'HR' },
  { value: 'ADMIN',       label: 'Admin' },
]
const EMP_TYPES = [
  { value: 'FULL_TIME',  label: 'Full Time' },
  { value: 'PART_TIME',  label: 'Part Time' },
  { value: 'CONTRACT',   label: 'Contract' },
]
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const GENDERS = ['Male', 'Female', 'Other']
const MARITAL_STATUSES = ['Single', 'Married', 'Divorced', 'Widowed']

const DOC_TYPES: { type: string; label: string; accept: string; hint: string }[] = [
  { type: 'aadhaar',       label: 'Aadhaar Card',          accept: 'image/*,.pdf', hint: 'Front + back scan or PDF, max 10 MB' },
  { type: 'pan',           label: 'PAN Card',              accept: 'image/*,.pdf', hint: 'Scan or photo of PAN card' },
  { type: 'drivingLicense',label: 'Driving Licence',       accept: 'image/*,.pdf', hint: 'Front + back of DL' },
  { type: 'agreement',     label: 'Employment Agreement',  accept: '.pdf,.doc,.docx', hint: 'Offer letter or employment contract' },
  { type: 'photo',         label: 'Passport Photo',        accept: 'image/*',     hint: 'Recent passport-size photograph' },
]

// ── Helpers ────────────────────────────────────────────────────────────────────
function Field({ label, required, error, children }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-foreground/80">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      {children}
      {error && (
        <p className="flex items-center gap-1 text-xs text-red-500">
          <AlertCircle className="w-3 h-3 shrink-0" />{error}
        </p>
      )}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1 mt-4 first:mt-0">
      {children}
    </p>
  )
}

// ── Document Upload Card ───────────────────────────────────────────────────────
function DocCard({
  type, label, hint, accept, url, employeeId, onUploaded,
}: {
  type: string; label: string; hint: string; accept: string
  url?: string | null; employeeId: string; onUploaded: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const upload = useUploadEmployeeDocument()
  const remove = useDeleteEmployeeDocument()
  const [localFile, setLocalFile] = useState<File | null>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setLocalFile(f)
    upload.mutate({ id: employeeId, type, file: f }, {
      onSuccess: () => { setLocalFile(null); onUploaded() },
    })
    e.target.value = ''
  }

  const uploading = upload.isPending
  const removing  = remove.isPending
  const hasDoc    = !!url

  return (
    <div className={`border rounded-xl p-4 flex items-center gap-4 transition-colors ${
      hasDoc ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800/50 dark:bg-emerald-900/10'
             : 'border-border/60 bg-muted/20 hover:border-border'
    }`}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
        hasDoc ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-muted'
      }`}>
        {hasDoc
          ? <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          : <FileText className="w-5 h-5 text-muted-foreground" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{label}</p>
        <p className="text-xs text-muted-foreground">{hasDoc ? 'Uploaded' : hint}</p>
        {localFile && (
          <p className="text-xs text-blue-600 mt-0.5">Uploading: {localFile.name}</p>
        )}
      </div>
      <div className="flex gap-1.5 shrink-0">
        {hasDoc && (
          <>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
              <a href={url!} target="_blank" rel="noreferrer">
                <Eye className="w-3.5 h-3.5" />
              </a>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
              onClick={() => remove.mutate({ id: employeeId, type }, { onSuccess: onUploaded })}
              disabled={removing}
            >
              {removing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            </Button>
          </>
        )}
        <Button
          variant={hasDoc ? 'outline' : 'default'}
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading
            ? <><Loader2 className="w-3 h-3 animate-spin" />Uploading...</>
            : <><Upload className="w-3 h-3" />{hasDoc ? 'Replace' : 'Upload'}</>
          }
        </Button>
        <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleFile} />
      </div>
    </div>
  )
}

// ── Main Dialog ────────────────────────────────────────────────────────────────
interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  employee?: any
}

const blankForm = () => ({
  // Personal
  name: '', email: '', phone: '', dateOfBirth: '', gender: '', bloodGroup: '',
  maritalStatus: '', currentAddress: '', permanentAddress: '',
  emergencyName: '', emergencyPhone: '', emergencyRelation: '',
  // Employment
  role: 'ENGINEER', department: '', designation: '', employmentType: 'FULL_TIME',
  joinDate: new Date().toISOString().slice(0, 10), reportingTo: '',
  // Payroll
  basicSalary: '', hra: '', otherAllowances: '', pfEnabled: false, esiEnabled: false,
  // KYC
  aadhaarNumber: '', panNumber: '', bankName: '', bankIFSC: '', passbookNumber: '',
})

export function EmployeeFormDialog({ open, onOpenChange, employee }: Props) {
  const isEdit = !!employee
  const create = useCreateEmployee()
  const update = useUpdateEmployee()
  const { data: docUrls, refetch: refetchDocs } = useEmployeeDocuments(employee?.id ?? '')

  const [tab, setTab] = useState('personal')
  const [form, setForm] = useState(blankForm())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [inviteResult, setInviteResult] = useState<{ email: string; sent: boolean; error?: string } | null>(null)

  useEffect(() => {
    if (!open) { setTab('personal'); setErrors({}); setInviteResult(null); return }
    if (employee) {
      setForm({
        name: employee.user?.name ?? '',
        email: employee.user?.email ?? '',
        phone: employee.user?.phone ?? '',
        dateOfBirth: employee.dateOfBirth ? new Date(employee.dateOfBirth).toISOString().slice(0, 10) : '',
        gender: employee.gender ?? '',
        bloodGroup: employee.bloodGroup ?? '',
        maritalStatus: employee.maritalStatus ?? '',
        currentAddress: employee.currentAddress ?? '',
        permanentAddress: employee.permanentAddress ?? '',
        emergencyName: employee.emergencyName ?? '',
        emergencyPhone: employee.emergencyPhone ?? '',
        emergencyRelation: employee.emergencyRelation ?? '',
        role: employee.user?.role ?? 'ENGINEER',
        department: employee.department ?? '',
        designation: employee.designation ?? '',
        employmentType: employee.employmentType ?? 'FULL_TIME',
        joinDate: employee.joinDate ? new Date(employee.joinDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
        reportingTo: employee.reportingTo ?? '',
        basicSalary: employee.basicSalary ? String(employee.basicSalary) : '',
        hra: employee.hra ? String(employee.hra) : '',
        otherAllowances: employee.otherAllowances ? String(employee.otherAllowances) : '',
        pfEnabled: employee.pfEnabled ?? false,
        esiEnabled: employee.esiEnabled ?? false,
        aadhaarNumber: employee.aadhaarNumber ?? '',
        panNumber: employee.panNumber ?? '',
        bankName: employee.bankName ?? '',
        bankIFSC: employee.bankIFSC ?? '',
        passbookNumber: employee.passbookNumber ?? '',
      })
    } else {
      setForm(blankForm())
    }
  }, [open, employee])

  const set = (key: string, val: any) => {
    setForm(f => ({ ...f, [key]: val }))
    if (errors[key]) setErrors(e => ({ ...e, [key]: '' }))
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Required'
    if (!isEdit) {
      if (!form.email.trim()) e.email = 'Required'
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email'
    }
    if (!form.department) e.department = 'Required'
    if (!form.designation.trim()) e.designation = 'Required'
    if (!form.joinDate) e.joinDate = 'Required'
    setErrors(e)
    if (Object.keys(e).length > 0) {
      // Switch to the tab that has the first error
      if (e.name || e.email || e.phone) setTab('personal')
      else if (e.department || e.designation || e.joinDate) setTab('employment')
    }
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      dateOfBirth: form.dateOfBirth || undefined,
      gender: form.gender || undefined,
      bloodGroup: form.bloodGroup || undefined,
      maritalStatus: form.maritalStatus || undefined,
      currentAddress: form.currentAddress.trim() || undefined,
      permanentAddress: form.permanentAddress.trim() || undefined,
      emergencyName: form.emergencyName.trim() || undefined,
      emergencyPhone: form.emergencyPhone.trim() || undefined,
      emergencyRelation: form.emergencyRelation.trim() || undefined,
      role: form.role,
      department: form.department,
      designation: form.designation.trim(),
      employmentType: form.employmentType,
      joinDate: form.joinDate,
      reportingTo: form.reportingTo.trim() || undefined,
      basicSalary: form.basicSalary ? parseFloat(form.basicSalary) : undefined,
      hra: form.hra ? parseFloat(form.hra) : undefined,
      otherAllowances: form.otherAllowances ? parseFloat(form.otherAllowances) : undefined,
      pfEnabled: form.pfEnabled,
      esiEnabled: form.esiEnabled,
      aadhaarNumber: form.aadhaarNumber.trim() || undefined,
      panNumber: form.panNumber.trim() || undefined,
      bankName: form.bankName.trim() || undefined,
      bankIFSC: form.bankIFSC.trim() || undefined,
      passbookNumber: form.passbookNumber.trim() || undefined,
    }
    if (isEdit) {
      await update.mutateAsync({ id: employee.id, ...payload })
      onOpenChange(false)
    } else {
      const result = await create.mutateAsync(payload)
      setInviteResult({
        email: payload.email,
        sent: result?.clerkInviteSent ?? false,
        error: result?.clerkInviteError,
      })
    }
  }

  const busy = create.isPending || update.isPending
  const ctaLabel = busy ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Employee'

  // Show invite result screen after creation
  if (inviteResult) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm">
          <div className="flex flex-col items-center text-center gap-4 py-4">
            {inviteResult.sent ? (
              <>
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                  <MailCheck className="w-8 h-8 text-emerald-600" />
                </div>
                <div>
                  <p className="text-lg font-semibold">Employee Added!</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    A login invitation has been sent to
                  </p>
                  <p className="text-sm font-medium text-blue-600 mt-0.5">{inviteResult.email}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    They'll receive an email from Clerk with a link to set up their password and access the platform.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
                  <MailWarning className="w-8 h-8 text-amber-600" />
                </div>
                <div>
                  <p className="text-lg font-semibold">Employee Added</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    But the login invite to <span className="font-medium">{inviteResult.email}</span> could not be sent automatically.
                  </p>
                  {inviteResult.error && (
                    <p className="text-xs text-red-500 mt-2 font-mono bg-red-50 rounded p-2">{inviteResult.error}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    Use the Send button (✈) on the employee row to retry, or send an invite manually from the Clerk dashboard.
                  </p>
                </div>
              </>
            )}
            <Button className="w-full" onClick={() => onOpenChange(false)}>Done</Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60 shrink-0">
          <DialogTitle className="text-xl">
            {isEdit ? `Edit — ${employee?.user?.name ?? 'Employee'}` : 'Add New Employee'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {isEdit
              ? 'Update details below. Documents can be uploaded in the Documents tab.'
              : 'Fill in the employee details. You can upload documents after creation.'}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="flex flex-col flex-1 min-h-0">
          {/* Tab bar */}
          <div className="px-6 pt-3 pb-0 shrink-0 border-b border-border/40">
            <TabsList className="h-9 bg-transparent p-0 gap-0 w-full justify-start">
              {[
                { value: 'personal',    label: 'Personal',    icon: User },
                { value: 'employment',  label: 'Employment',  icon: Briefcase },
                { value: 'payroll',     label: 'Payroll & KYC', icon: IndianRupee },
                ...(isEdit ? [{ value: 'documents', label: 'Documents', icon: FileText }] : []),
              ].map(t => (
                <TabsTrigger
                  key={t.value}
                  value={t.value}
                  className="flex items-center gap-1.5 h-9 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none bg-transparent text-muted-foreground text-xs px-4"
                >
                  <t.icon className="w-3.5 h-3.5" />
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-6 py-5">

            {/* ── PERSONAL TAB ── */}
            <TabsContent value="personal" className="mt-0 space-y-4">
              <SectionLabel>Basic Info</SectionLabel>
              <Field label="Full Name" required error={errors.name}>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Rajesh Kumar" value={form.name} onChange={e => set('name', e.target.value)} />
                </div>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Email" required error={errors.email}>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input type="email" className="pl-9" placeholder="raj@company.com"
                      value={form.email} onChange={e => set('email', e.target.value)}
                      disabled={isEdit} />
                  </div>
                </Field>
                <Field label="Phone">
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input type="tel" className="pl-9" placeholder="+91 98765 43210"
                      value={form.phone} onChange={e => set('phone', e.target.value)} />
                  </div>
                </Field>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Field label="Date of Birth">
                  <Input type="date" value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} />
                </Field>
                <Field label="Gender">
                  <Select value={form.gender} onValueChange={v => set('gender', v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{GENDERS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Blood Group">
                  <Select value={form.bloodGroup} onValueChange={v => set('bloodGroup', v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{BLOOD_GROUPS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
              </div>

              <Field label="Marital Status">
                <Select value={form.maritalStatus} onValueChange={v => set('maritalStatus', v)}>
                  <SelectTrigger className="w-48"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{MARITAL_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </Field>

              <Separator />
              <SectionLabel>Address</SectionLabel>
              <Field label="Current Address">
                <textarea
                  className="w-full text-sm border border-input rounded-md px-3 py-2 resize-none bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  rows={2} placeholder="Flat 4B, Andheri West, Mumbai - 400053"
                  value={form.currentAddress} onChange={e => set('currentAddress', e.target.value)}
                />
              </Field>
              <Field label="Permanent Address">
                <textarea
                  className="w-full text-sm border border-input rounded-md px-3 py-2 resize-none bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  rows={2} placeholder="Village / Home address"
                  value={form.permanentAddress} onChange={e => set('permanentAddress', e.target.value)}
                />
              </Field>

              <Separator />
              <SectionLabel>Emergency Contact</SectionLabel>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Name">
                  <Input placeholder="Parent / Spouse name" value={form.emergencyName} onChange={e => set('emergencyName', e.target.value)} />
                </Field>
                <Field label="Phone">
                  <Input type="tel" placeholder="+91 98765 43210" value={form.emergencyPhone} onChange={e => set('emergencyPhone', e.target.value)} />
                </Field>
                <Field label="Relation">
                  <Input placeholder="Father / Spouse" value={form.emergencyRelation} onChange={e => set('emergencyRelation', e.target.value)} />
                </Field>
              </div>
            </TabsContent>

            {/* ── EMPLOYMENT TAB ── */}
            <TabsContent value="employment" className="mt-0 space-y-4">
              <SectionLabel>Role & Department</SectionLabel>
              <div className="grid grid-cols-2 gap-3">
                <Field label="System Role" required>
                  <Select value={form.role} onValueChange={v => set('role', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Employment Type">
                  <Select value={form.employmentType} onValueChange={v => set('employmentType', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{EMP_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
              </div>

              <Field label="Department" required error={errors.department}>
                <Select value={form.department} onValueChange={v => set('department', v)}>
                  <SelectTrigger className={errors.department ? 'border-red-400' : ''}>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                      <SelectValue placeholder="Select department" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>{DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Designation" required error={errors.designation}>
                  <Input placeholder="e.g. Field Engineer" value={form.designation}
                    onChange={e => set('designation', e.target.value)}
                    className={errors.designation ? 'border-red-400' : ''} />
                </Field>
                <Field label="Join Date" required error={errors.joinDate}>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input type="date" className="pl-9" value={form.joinDate}
                      onChange={e => set('joinDate', e.target.value)}
                      style={{ colorScheme: 'auto' }} />
                  </div>
                </Field>
              </div>

              <Field label="Reporting To (Name)">
                <Input placeholder="Manager name" value={form.reportingTo} onChange={e => set('reportingTo', e.target.value)} />
              </Field>
            </TabsContent>

            {/* ── PAYROLL & KYC TAB ── */}
            <TabsContent value="payroll" className="mt-0 space-y-4">
              <SectionLabel>Monthly Salary</SectionLabel>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { key: 'basicSalary', label: 'Basic (₹/mo)', placeholder: '25,000' },
                  { key: 'hra',         label: 'HRA (₹/mo)',   placeholder: '10,000' },
                  { key: 'otherAllowances', label: 'Other (₹/mo)', placeholder: '5,000' },
                ].map(f => (
                  <Field key={f.key} label={f.label}>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                      <Input type="number" className="pl-7" placeholder={f.placeholder}
                        value={(form as any)[f.key]}
                        onChange={e => set(f.key, e.target.value)} />
                    </div>
                  </Field>
                ))}
              </div>

              {/* CTC summary */}
              {(form.basicSalary || form.hra || form.otherAllowances) && (
                <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 rounded-lg px-4 py-3">
                  <span className="text-sm text-muted-foreground">Total CTC / month</span>
                  <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                    ₹{(
                      [form.basicSalary, form.hra, form.otherAllowances]
                        .reduce((s, v) => s + (parseFloat(v || '0') || 0), 0)
                    ).toLocaleString('en-IN')}
                  </span>
                </div>
              )}

              <div className="flex gap-6">
                <div className="flex items-center gap-2.5">
                  <Switch id="pf" checked={form.pfEnabled} onCheckedChange={v => set('pfEnabled', v)} />
                  <Label htmlFor="pf" className="cursor-pointer text-sm">PF Enabled</Label>
                </div>
                <div className="flex items-center gap-2.5">
                  <Switch id="esi" checked={form.esiEnabled} onCheckedChange={v => set('esiEnabled', v)} />
                  <Label htmlFor="esi" className="cursor-pointer text-sm">ESI Enabled</Label>
                </div>
              </div>

              <Separator />
              <SectionLabel>KYC Details</SectionLabel>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Aadhaar Number">
                  <Input placeholder="1234 5678 9012" maxLength={14} value={form.aadhaarNumber}
                    onChange={e => set('aadhaarNumber', e.target.value)} />
                </Field>
                <Field label="PAN Number">
                  <Input placeholder="ABCDE1234F" maxLength={10} className="uppercase" value={form.panNumber}
                    onChange={e => set('panNumber', e.target.value.toUpperCase())} />
                </Field>
              </div>

              <Separator />
              <SectionLabel>Bank Account</SectionLabel>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Bank Name">
                  <Input placeholder="SBI / HDFC / ICICI" value={form.bankName} onChange={e => set('bankName', e.target.value)} />
                </Field>
                <Field label="IFSC Code">
                  <Input placeholder="SBIN0001234" className="uppercase" value={form.bankIFSC}
                    onChange={e => set('bankIFSC', e.target.value.toUpperCase())} />
                </Field>
              </div>
              <Field label="Account Number">
                <Input placeholder="Account number" value={form.passbookNumber} onChange={e => set('passbookNumber', e.target.value)} />
              </Field>
            </TabsContent>

            {/* ── DOCUMENTS TAB (edit only) ── */}
            {isEdit && (
              <TabsContent value="documents" className="mt-0 space-y-3">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold">Identity & Employment Documents</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Accepted: PDF, JPG, PNG · Max 10 MB each</p>
                  </div>
                  <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 text-xs">
                    {DOC_TYPES.filter(d => docUrls?.[d.type]).length} / {DOC_TYPES.length} uploaded
                  </Badge>
                </div>
                {DOC_TYPES.map(d => (
                  <DocCard
                    key={d.type}
                    type={d.type}
                    label={d.label}
                    hint={d.hint}
                    accept={d.accept}
                    url={docUrls?.[d.type]}
                    employeeId={employee.id}
                    onUploaded={() => refetchDocs()}
                  />
                ))}
              </TabsContent>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border/60 flex items-center justify-between gap-3 shrink-0">
            <div className="flex gap-2">
              {['personal', 'employment', 'payroll', ...(isEdit ? ['documents'] : [])].map((t, i, arr) => {
                const prev = arr[i - 1], next = arr[i + 1]
                if (t !== tab) return null
                return (
                  <div key={t} className="flex gap-2">
                    {prev && (
                      <Button variant="ghost" size="sm" onClick={() => setTab(prev)}>← Back</Button>
                    )}
                    {next && (
                      <Button variant="outline" size="sm" onClick={() => setTab(next)}>Next →</Button>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={busy} className="min-w-28">
                {busy ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />{ctaLabel}</> : ctaLabel}
              </Button>
            </div>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
