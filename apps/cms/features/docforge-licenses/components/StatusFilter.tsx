

import { useEffect, useRef, useState } from 'react'
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@agency/ui'
import { Search } from 'lucide-react'
import { messages } from '@/lib/messages'
import type { LicenseStatus } from '../types'

type StatusFilterValue = LicenseStatus | 'all'

interface StatusFilterProps {
  status: StatusFilterValue
  onStatusChange: (status: StatusFilterValue) => void
  search: string
  onSearchChange: (search: string) => void
}

const STATUS_OPTIONS: { value: StatusFilterValue; label: string }[] = [
  { value: 'all', label: messages.docforgeLicenses.filterAll },
  { value: 'active', label: messages.docforgeLicenses.filterActive },
  { value: 'expired', label: messages.docforgeLicenses.filterExpired },
  { value: 'inactive', label: messages.docforgeLicenses.filterInactive },
]

export function StatusFilter({ status, onStatusChange, search, onSearchChange }: StatusFilterProps) {
  const [localSearch, setLocalSearch] = useState(search)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      onSearchChange(localSearch)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [localSearch, onSearchChange])

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          placeholder={messages.docforgeLicenses.searchPlaceholder}
          className="pl-9"
          aria-label={messages.docforgeLicenses.searchPlaceholder}
        />
      </div>
      <Select value={status} onValueChange={(v) => onStatusChange(v as StatusFilterValue)}>
        <SelectTrigger className="w-full sm:w-44" aria-label={messages.docforgeLicenses.columnStatus}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export type { StatusFilterValue }
