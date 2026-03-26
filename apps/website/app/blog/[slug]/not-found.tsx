'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { usePlausible } from 'next-plausible'
import type { PlausibleEvents } from '@/lib/plausible'

export default function BlogPostNotFound() {
  const plausible = usePlausible<PlausibleEvents>()

  useEffect(() => {
    plausible('404', { props: { path: window.location.pathname } })
  }, [])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="mb-2 text-sm font-medium uppercase tracking-wider text-primary">
        404
      </p>
      <h1 className="mb-3 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
        Artykuł nie został znaleziony
      </h1>
      <p className="mb-8 max-w-md text-muted-foreground">
        Ten artykuł nie istnieje lub nie został jeszcze opublikowany.
      </p>
      <Link
        href="/blog"
        className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <ArrowLeft className="h-4 w-4" />
        Wróć do bloga
      </Link>
    </div>
  )
}
