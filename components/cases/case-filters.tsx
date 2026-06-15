'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu'
import { Filter, X } from 'lucide-react'
import { CaseStatus, Priority } from '@/types'

interface CaseFiltersProps {
  onFilterChange: (filters: FilterState) => void
}

export interface FilterState {
  search: string
  statuses: CaseStatus[]
  banks: string[]
  priorities: Priority[]
  engineers: string[]
  dateRange?: { from: string; to: string }
}

const BANKS = ['ICICI Bank', 'HDFC Bank', 'SBI', 'Axis Bank', 'Kotak Bank', 'Bank of Baroda']
const ENGINEERS = ['Raj Kumar', 'Priya Singh', 'Amit Patel', 'Neha Sharma', 'Rohit Verma', 'Deepak Nair']
const STATUSES: CaseStatus[] = ['new', 'assigned', 'site_visit_scheduled', 'site_visit_completed', 'under_verification', 'finalized', 'on_hold']
const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'critical']

export function CaseFilters({ onFilterChange }: CaseFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    statuses: [],
    banks: [],
    priorities: [],
    engineers: [],
  })

  const handleSearchChange = (value: string) => {
    const newFilters = { ...filters, search: value }
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  const toggleStatus = (status: CaseStatus) => {
    const newFilters = {
      ...filters,
      statuses: filters.statuses.includes(status)
        ? filters.statuses.filter((s) => s !== status)
        : [...filters.statuses, status],
    }
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  const toggleBank = (bank: string) => {
    const newFilters = {
      ...filters,
      banks: filters.banks.includes(bank)
        ? filters.banks.filter((b) => b !== bank)
        : [...filters.banks, bank],
    }
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  const togglePriority = (priority: Priority) => {
    const newFilters = {
      ...filters,
      priorities: filters.priorities.includes(priority)
        ? filters.priorities.filter((p) => p !== priority)
        : [...filters.priorities, priority],
    }
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  const toggleEngineer = (engineer: string) => {
    const newFilters = {
      ...filters,
      engineers: filters.engineers.includes(engineer)
        ? filters.engineers.filter((e) => e !== engineer)
        : [...filters.engineers, engineer],
    }
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  const clearFilters = () => {
    const emptyFilters: FilterState = {
      search: '',
      statuses: [],
      banks: [],
      priorities: [],
      engineers: [],
    }
    setFilters(emptyFilters)
    onFilterChange(emptyFilters)
  }

  const activeFilters = filters.statuses.length + filters.banks.length + filters.priorities.length + filters.engineers.length

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search by case ID or property address..."
          value={filters.search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="flex-1"
        />

        {/* Status Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="w-4 h-4" />
              Status
              {filters.statuses.length > 0 && (
                <span className="ml-1 inline-flex items-center justify-center w-5 h-5 text-xs font-semibold text-white bg-primary rounded-full">
                  {filters.statuses.length}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {STATUSES.map((status) => (
              <DropdownMenuCheckboxItem
                key={status}
                checked={filters.statuses.includes(status)}
                onCheckedChange={() => toggleStatus(status)}
              >
                {status.replace(/_/g, ' ')}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Bank Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              Bank
              {filters.banks.length > 0 && (
                <span className="ml-1 inline-flex items-center justify-center w-5 h-5 text-xs font-semibold text-white bg-primary rounded-full">
                  {filters.banks.length}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Filter by Bank</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {BANKS.map((bank) => (
              <DropdownMenuCheckboxItem
                key={bank}
                checked={filters.banks.includes(bank)}
                onCheckedChange={() => toggleBank(bank)}
              >
                {bank}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Priority Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              Priority
              {filters.priorities.length > 0 && (
                <span className="ml-1 inline-flex items-center justify-center w-5 h-5 text-xs font-semibold text-white bg-primary rounded-full">
                  {filters.priorities.length}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Filter by Priority</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {PRIORITIES.map((priority) => (
              <DropdownMenuCheckboxItem
                key={priority}
                checked={filters.priorities.includes(priority)}
                onCheckedChange={() => togglePriority(priority)}
              >
                {priority.charAt(0).toUpperCase() + priority.slice(1)}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Clear filters */}
        {activeFilters > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="gap-2"
          >
            <X className="w-4 h-4" />
            Clear
          </Button>
        )}
      </div>
    </div>
  )
}
