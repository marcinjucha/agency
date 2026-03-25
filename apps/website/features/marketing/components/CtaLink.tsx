'use client'

import Link from 'next/link'
import { trackEvent } from '@/lib/plausible'

interface CtaLinkProps {
  href: string
  location: 'hero' | 'final_cta' | 'navbar'
  className?: string
  children: React.ReactNode
  id?: string
}

export function CtaLink({ href, location, className, children, id }: CtaLinkProps) {
  return (
    <Link
      id={id}
      href={href}
      className={className}
      onClick={() => trackEvent('CTA Clicked', { props: { location } })}
    >
      {children}
    </Link>
  )
}
