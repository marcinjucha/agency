'use client'

import Link from 'next/link'
import { usePlausible } from 'next-plausible'
import type { PlausibleEvents } from '@/lib/plausible'

interface CtaLinkProps {
  href: string
  location: 'hero' | 'final_cta' | 'navbar'
  className?: string
  children: React.ReactNode
  id?: string
}

export function CtaLink({ href, location, className, children, id }: CtaLinkProps) {
  const plausible = usePlausible<PlausibleEvents>()

  return (
    <Link
      id={id}
      href={href}
      className={className}
      onClick={() => plausible('CTA Clicked', { props: { location } })}
    >
      {children}
    </Link>
  )
}
