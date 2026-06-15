'use client'

import { useState, useEffect } from 'react'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { useCreateEmployee, useUpdateEmployee } from '@/lib/api/hooks'

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

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  employee?: any   // populated for edit mode
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  )
}

function SectionHead({ title }: { title: string }) {
  return (
    <div>
      <Separator className="mb-4" />
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">{title}</p>
    </div>
  )
}

export function EmployeeFormSheet({ open, onOpenChange, employee }: Props) {
  const isEdit = !!employee
  const create = useCreateEmployee()
  const update = useUpdateEmployee()

  const [form, setForm] = useState({
    name: '', email: '', phone: '', role: 'ENGINEER',
    department: '', designation: '', employmentType: 'FULL_TIME',
    joinDate: new Date().toISOString().slice(0, 10),
    reportingTo: '',
    basicSalary: '', hra: '', otherAllowances: '',
    pfEnabled: false, esiEnabled: false,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Populate form in edit mode
  useEffect(() => {
    if (employee) {
      setForm({
        name: employee.user?.name ?? '',
        email: employee.user?.email ?? '',
        phone: employee.user?.phone ?? '',
        role: employee.user?.role ?? 'ENGINEER',
        department: employee.department ?? '',
        designation: employee.designation ?? '',
        employmentType: employee.employmentType ?? 'FULL_TIME',
        joinDate: employee.joinDate
          ? new Date(employee.joinDate).toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10),
        reportingTo: employee.reportingTo ?? '',
        basicSalary: employee.basicSalary ? String(employee.basicSalary) : '',
        hra: employee.hra ? String(employee.hra) : '',
        otherAllowances: employee.otherAllowances ? String(employee.otherAllowances) : '',
        pfEnabled: employee.pfEnabled ?? false,
        esiEnabled: employee.esiEnabled ?? false,
      })
    }
  }, [employee])

  const set = (key: string, val: any) => {
    setForm(f => ({ ...f, [key]: val }))
    if (errors[key]) setErrors(e => ({ ...e, [key]: '' }))
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Name is required'
    if (!isEdit && !form.email.trim()) e.email = 'Email is required'
    if (!isEdit && form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email'
    if (!form.department) e.department = 'Department is required'
    if (!form.designation.trim()) e.designation = 'Designation is required'
    if (!form.joinDate) e.joinDate = 'Join date is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
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
    }
    if (isEdit) {
      await update.mutateAsync({ id: employee.id, ...payload })
    } else {
      await create.mutateAsync(payload)
    }
    onOpenChange(false)
    if (!isEdit) {
      setForm({
        name: '', email: '', phone: '', role: 'ENGINEER',
        department: '', designation: '', employmentType: 'FULL_TIME',
        joinDate: new Date().toISOString().slice(0, 10),
        reportingTo: '', basicSalary: '', hra: '', otherAllowances: '',
        pfEnabled: false, esiEnabled: false,
      })
    }
  }

  const busy = create.isPending || update.isPending

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-5">
          <SheetTitle>{isEdit ? 'Edit Employee' : 'Add New Employee'}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? 'Update employee details. Email & role changes take effect immediately.'
              : 'The employee will be able to sign in using their email once you save.'}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 pb-6">
          {/* Personal */}
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Personal Info</p>

          <Field label="Full Name" required>
            <Input
              placeholder="Rajesh Kumar"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              className={errors.name ? 'border-red-400' : ''}
            />
            {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Email" required>
              <Input
                type="email"
                placeholder="raj@email.com"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                disabled={isEdit}
                className={errors.email ? 'border-red-400' : ''}
              />
              {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
            </Field>
            <Field label="Phone">
              <Input
                type="tel"
                placeholder="+91 98765 43210"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
              />
            </Field>
          </div>

          <SectionHead title="Role & Employment" />

          <div className="grid grid-cols-2 gap-3">
            <Field label="System Role" required>
              <Select value={form.role} onValueChange={v => set('role', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Employment Type">
              <Select value={form.employmentType} onValueChange={v => set('employmentType', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EMP_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="Department" required>
            <Select value={form.department} onValueChange={v => set('department', v)}>
              <SelectTrigger className={errors.department ? 'border-red-400' : ''}>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.department && <p className="text-xs text-red-500">{errors.department}</p>}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Designation" required>
              <Input
                placeholder="Field Engineer"
                value={form.designation}
                onChange={e => set('designation', e.target.value)}
                className={errors.designation ? 'border-red-400' : ''}
              />
              {errors.designation && <p className="text-xs text-red-500">{errors.designation}</p>}
            </Field>
            <Field label="Join Date" required>
              <Input
                type="date"
                value={form.joinDate}
                onChange={e => set('joinDate', e.target.value)}
                className={errors.joinDate ? 'border-red-400' : ''}
              />
              {errors.joinDate && <p className="text-xs text-red-500">{errors.joinDate}</p>}
            </Field>
          </div>

          <Field label="Reporting To (Name)">
            <Input
              placeholder="Manager name"
              value={form.reportingTo}
              onChange={e => set('reportingTo', e.target.value)}
            />
          </Field>

          <SectionHead title="Salary & Benefits" />

          <div className="grid grid-cols-3 gap-3">
            <Field label="Basic (₹/mo)">
              <Input
                type="number"
                placeholder="25000"
                value={form.basicSalary}
                onChange={e => set('basicSalary', e.target.value)}
              />
            </Field>
            <Field label="HRA (₹/mo)">
              <Input
                type="number"
                placeholder="10000"
                value={form.hra}
                onChange={e => set('hra', e.target.value)}
              />
            </Field>
            <Field label="Other (₹/mo)">
              <Input
                type="number"
                placeholder="5000"
                value={form.otherAllowances}
                onChange={e => set('otherAllowances', e.target.value)}
              />
            </Field>
          </div>

          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <Switch
                id="pf"
                checked={form.pfEnabled}
                onCheckedChange={v => set('pfEnabled', v)}
              />
              <Label htmlFor="pf" className="text-sm cursor-pointer">PF Enabled</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="esi"
                checked={form.esiEnabled}
                onCheckedChange={v => set('esiEnabled', v)}
              />
              <Label htmlFor="esi" className="text-sm cursor-pointer">ESI Enabled</Label>
            </div>
          </div>

          <Separator />

          <div className="flex gap-3 pt-2">
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={busy}
            >
              {busy ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Employee'}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
