'use client'

import { useNavigate, useSearch } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { Input } from '@agency/ui'
import { messages } from '@/lib/messages'
import { Search } from 'lucide-react'

export function ProductSearch() {
  const navigate = useNavigate({ from: '/produkty/' })
  const search = useSearch({ strict: false })
  const initialQuery = (search.q as string | undefined) ?? ''
  const [value, setValue] = useState(initialQuery)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstRender = useRef(true)

  function pushQuery(q: string) {
    navigate({
      search: (prev) => {
        const next = { ...prev }
        if (q) {
          next.q = q
        } else {
          delete next.q
        }
        return next
      },
      replace: true,
    })
  }

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      pushQuery(value)
    }, 300)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [value])

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        placeholder={messages.search.placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="pl-9"
        aria-label={messages.search.placeholder}
      />
    </div>
  )
}
