import { Link } from '@tanstack/react-router'

interface CtaLinkProps {
  href: string
  location: 'hero' | 'final_cta' | 'navbar'
  className?: string
  children: React.ReactNode
  id?: string
}

export function CtaLink({ href, location: _location, className, children, id }: CtaLinkProps) {
  return (
    <Link
      id={id}
      to={href}
      className={className}
    >
      {children}
    </Link>
  )
}
