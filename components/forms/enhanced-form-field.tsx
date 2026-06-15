'use client'

import { ReactNode, useState } from 'react'
import { Field, FieldLabel, FieldDescription, FieldError } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface EnhancedFormFieldProps {
  label: string
  name: string
  type?: 'text' | 'email' | 'password' | 'number' | 'textarea' | 'select'
  placeholder?: string
  description?: string
  error?: string
  disabled?: boolean
  required?: boolean
  value?: string
  onChange?: (value: string) => void
  onBlur?: () => void
  options?: { label: string; value: string }[]
  children?: ReactNode
}

export function EnhancedFormField({
  label,
  name,
  type = 'text',
  placeholder,
  description,
  error,
  disabled,
  required,
  value,
  onChange,
  onBlur,
  options,
  children,
}: EnhancedFormFieldProps) {
  const [isFocused, setIsFocused] = useState(false)
  const [hasValue, setHasValue] = useState(!!value)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setHasValue(e.target.value.length > 0)
    onChange?.(e.target.value)
  }

  const handleSelectChange = (value: string) => {
    setHasValue(true)
    onChange?.(value)
  }

  return (
    <Field className="transition-smooth">
      <div className="relative">
        <FieldLabel
          htmlFor={name}
          className={cn(
            'transition-smooth duration-200 origin-left',
            isFocused || hasValue
              ? 'text-xs font-semibold translate-y-0 text-primary'
              : 'text-sm text-muted-foreground translate-y-7'
          )}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </FieldLabel>

        {type === 'textarea' ? (
          <Textarea
            id={name}
            name={name}
            placeholder={isFocused ? placeholder : ''}
            disabled={disabled}
            value={value}
            onChange={handleChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              setIsFocused(false)
              onBlur?.()
            }}
            className={cn(
              'transition-smooth pt-6 pb-3',
              error ? 'border-red-500 focus:border-red-500' : 'border-border/50 focus:border-primary'
            )}
          />
        ) : type === 'select' ? (
          <Select value={value} onValueChange={handleSelectChange} disabled={disabled}>
            <SelectTrigger
              className={cn(
                'transition-smooth pt-6 pb-3 w-full',
                error ? 'border-red-500 focus:border-red-500' : 'border-border/50 focus:border-primary'
              )}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
            >
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            id={name}
            name={name}
            type={type}
            placeholder={isFocused ? placeholder : ''}
            disabled={disabled}
            value={value}
            onChange={handleChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              setIsFocused(false)
              onBlur?.()
            }}
            className={cn(
              'transition-smooth pt-6 pb-3',
              error ? 'border-red-500 focus:border-red-500' : 'border-border/50 focus:border-primary'
            )}
          />
        )}
      </div>

      {description && !error && (
        <FieldDescription className="text-xs text-muted-foreground mt-2 animate-in fade-in duration-200">
          {description}
        </FieldDescription>
      )}

      {error && (
        <FieldError className="text-xs text-red-500 mt-2 animate-in fade-in duration-200">
          {error}
        </FieldError>
      )}
    </Field>
  )
}
