// Shared chrome for the site navbars. Both Navbar (global, every non-landing
// page) and LandingNavbar (homepage) render an identical fixed header: a
// scroll-reactive background/blur, the same max-w-6xl container, and an h-16
// row. Each navbar supplies only its differing middle content as children.
//
// Extracted so the scroll-state effect and the header className live in one
// place — previously duplicated verbatim across Navbar.tsx and LandingNavbar.tsx.
import { useEffect, useState, type ReactNode } from 'react'

/**
 * Tracks whether the window has scrolled past `threshold` pixels.
 * Drives the navbar's transition from transparent to blurred/opaque.
 */
export function useScrolled(threshold = 16): boolean {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold])

  return scrolled
}

interface NavShellProps {
  /** Header row content (logo + nav + CTA). Lives inside the h-16 flex row. */
  children: ReactNode
  /**
   * Rendered after the header row, still inside <header> (e.g. LandingNavbar's
   * mobile menu drawer which must sit below the row but within the fixed shell).
   */
  belowRow?: ReactNode
  /**
   * When true, renders an h-16 spacer sibling after the fixed header to push
   * page content below it. LandingNavbar relies on the hero's own top padding
   * and passes `false`; Navbar needs the spacer and passes `true`.
   */
  withSpacer?: boolean
}

/**
 * Fixed-header shell: owns the scroll state, the fixed/blur className, and the
 * centered container + h-16 row. Each navbar fills in the row via `children`.
 */
export function NavShell({ children, belowRow, withSpacer = false }: NavShellProps) {
  const scrolled = useScrolled()

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${
          scrolled
            ? 'border-b border-[var(--hair)] bg-[var(--bg)]/85 backdrop-blur-xl'
            : 'border-b border-transparent bg-transparent'
        }`}
      >
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="flex h-16 items-center justify-between gap-4">{children}</div>
        </div>
        {belowRow}
      </header>

      {withSpacer && <div className="h-16" />}
    </>
  )
}
