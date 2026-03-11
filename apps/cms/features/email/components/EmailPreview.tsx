'use client'

import { useEffect, useState, useRef } from 'react'
import type { Block } from '../types'

interface EmailPreviewProps {
  blocks: Block[]
  className?: string
}

export function EmailPreview({ blocks, className }: EmailPreviewProps) {
  const [html, setHtml] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      if (blocks.length === 0) {
        setHtml('')
        return
      }

      // Cancel previous in-flight request before starting new one
      abortRef.current?.abort()
      abortRef.current = new AbortController()

      setLoading(true)
      try {
        const res = await fetch('/api/email-templates/render', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ blocks }),
          signal: abortRef.current.signal,
        })
        if (res.ok) {
          const { html: rendered } = await res.json()
          setHtml(rendered)
        }
      } catch (err) {
        // AbortError is expected when a newer request supersedes this one
        if (err instanceof Error && err.name !== 'AbortError') {
          // Preview errors are non-critical, fail silently
        }
      } finally {
        setLoading(false)
      }
    }, 600)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      abortRef.current?.abort()
    }
  }, [blocks])

  return (
    <div className={`relative flex flex-col h-full ${className ?? ''}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-muted-foreground">Podgląd</span>
        {loading && (
          <span className="text-xs text-muted-foreground animate-pulse">Generowanie…</span>
        )}
      </div>
      <div className="flex-1 border rounded-lg overflow-hidden bg-muted">
        {html ? (
          <iframe
            srcDoc={html}
            title="Podgląd emaila"
            className="w-full h-full border-0"
            sandbox="allow-same-origin"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            Dodaj bloki, aby zobaczyć podgląd
          </div>
        )}
      </div>
    </div>
  )
}
