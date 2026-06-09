// Landing primitives — faithful port of project/landing/primitives.jsx.
// Notes on the port:
//  - The prototype's `--accent` bare var does not exist in this codebase; the orange
//    is the existing `text-primary` / `bg-primary` token (#ea580c). The `--accent-*`
//    family (accent-soft / accent-ink / accent-2) IS defined in globals.css.
//  - Button APPENDS the incoming className (variant classes never get overwritten) —
//    fixes the prototype's `{...p}` spread-after-className bug.
//  - Reveal is intentionally NOT ported here; sections use the existing ScrollReveal.
import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { cn } from '@agency/ui'

type SectionTone = 'white' | 'alt' | 'tint'

interface SectionProps {
  id?: string
  tone?: SectionTone
  dense?: boolean
  children: ReactNode
  className?: string
}

export function Section({ id, tone = 'white', dense = false, children, className = '' }: SectionProps) {
  const bg = tone === 'alt' ? 'bg-[var(--bg-alt)]' : tone === 'tint' ? 'bg-[var(--bg-tint)]' : 'bg-[var(--bg)]'
  const pad = dense ? 'py-16 md:py-20' : 'py-20 md:py-28'
  return (
    <section id={id} className={cn('relative', bg, pad, className)}>
      {children}
    </section>
  )
}

type ContainerSize = 'narrow' | 'default' | 'wide'

interface ContainerProps {
  children: ReactNode
  className?: string
  size?: ContainerSize
}

export function Container({ children, className = '', size = 'default' }: ContainerProps) {
  const w = size === 'narrow' ? 'max-w-3xl' : size === 'wide' ? 'max-w-7xl' : 'max-w-6xl'
  return <div className={cn(w, 'mx-auto px-5 sm:px-8', className)}>{children}</div>
}

interface EyebrowProps {
  children: ReactNode
  className?: string
}

export function Eyebrow({ children, className = '' }: EyebrowProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2.5 mono text-[11px] font-medium uppercase tracking-[.2em] text-[var(--accent-ink)]',
        className,
      )}
    >
      <span className="block h-px w-6 bg-[var(--accent-ink)]" />
      {children}
    </div>
  )
}

interface SectionHeadProps {
  eyebrow?: ReactNode
  title: ReactNode
  sub?: ReactNode
  center?: boolean
  max?: string
}

export function SectionHead({ eyebrow, title, sub, center = false, max = 'max-w-2xl' }: SectionHeadProps) {
  const align = center ? 'text-center mx-auto items-center' : ''
  return (
    <div className={cn('flex flex-col', align, max)}>
      {eyebrow && <Eyebrow className={center ? 'justify-center' : ''}>{eyebrow}</Eyebrow>}
      <h2
        className={cn(
          'serif mt-5 text-[32px] md:text-[44px] leading-[1.08] tracking-[-0.02em] text-[var(--ink)]',
        )}
        style={{ fontWeight: 500, textWrap: 'balance' }}
      >
        {title}
      </h2>
      {sub && (
        <p className="mt-4 text-[16.5px] leading-relaxed text-[var(--muted)]" style={{ textWrap: 'pretty' }}>
          {sub}
        </p>
      )}
    </div>
  )
}

type ButtonVariant = 'primary' | 'ghost' | 'light'
type ButtonSize = 'sm' | 'md' | 'lg'

const BUTTON_BASE = 'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-[13px]',
  md: 'px-5 py-3 text-sm',
  lg: 'px-7 py-4 text-[15px]',
}

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white hover:bg-[var(--accent-2)] btn-glow',
  ghost: 'bg-transparent text-[var(--ink)] hover:bg-[var(--hair-soft)] border border-[var(--hair)]',
  light: 'bg-white text-[var(--ink)] hover:bg-white/90',
}

export function buttonClasses(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className = '') {
  // className is APPENDED last so callers extend (never overwrite) the variant styles.
  return cn(BUTTON_BASE, BUTTON_SIZES[size], BUTTON_VARIANTS[variant], className)
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: ReactNode
  iconLeft?: ReactNode
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconLeft,
  className = '',
  ...rest
}: ButtonProps) {
  return (
    <button className={buttonClasses(variant, size, className)} {...rest}>
      {iconLeft}
      {children}
      {icon}
    </button>
  )
}

interface CtaLinkProps {
  href: string
  className?: string
  children: ReactNode
  id?: string
}

/**
 * Shared CTA link. External URLs (http…) render a real <a>; everything else
 * renders a TanStack <Link>. The audit CTA destination is threaded down as a
 * prop (ctaUrl) from the page — never read from content.ts.
 */
export function CtaLink({ href, className, children, id }: CtaLinkProps) {
  if (/^https?:\/\//i.test(href)) {
    return (
      <a id={id} href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    )
  }
  return (
    <Link id={id} to={href} className={className}>
      {children}
    </Link>
  )
}
