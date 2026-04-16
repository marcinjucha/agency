

import { useEffect, useState, useRef } from 'react'
import type { Block } from '../types'
import { renderEmailPreviewFn } from '../server'

interface EmailPreviewProps {
  blocks: Block[]
  className?: string
}

export function EmailPreview({ blocks, className }: EmailPreviewProps) {
  const [html, setHtml] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      if (blocks.length === 0) {
        setHtml('')
        return
      }

      let cancelled = false
      setLoading(true)

      try {
        const { html: rendered } = await renderEmailPreviewFn({ data: { blocks } })
        if (!cancelled) setHtml(rendered)
      } catch {
        // Preview errors are non-critical, fail silently
      } finally {
        if (!cancelled) setLoading(false)
      }

      return () => {
        cancelled = true
      }
    }, 600)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
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
