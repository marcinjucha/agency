import { useEffect, useRef, useState, type ReactNode } from 'react'

interface ScrollRevealProps {
  children: ReactNode
  className?: string
  delay?: number
}

/**
 * Wrapper that triggers a fade-in-up animation when the element
 * enters the viewport. Uses a per-component IntersectionObserver to
 * avoid module-level singleton issues with Vite HMR.
 */
export function ScrollReveal({ children, className = '', delay = 0 }: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // Reduced-motion users: reveal immediately, no animation gating.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setIsVisible(true)
      return
    }

    // Already in (or above) the viewport on mount — reveal now. Without this an
    // element that is on-screen at load (or an anchor jump that lands directly on
    // a section, e.g. navbar "#wspolpraca") may never receive an intersection event.
    const rect = el.getBoundingClientRect()
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      setIsVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    )

    observer.observe(el)

    // Safety net: never leave content stuck at opacity 0. A fast scroll can skip the
    // frame where the element is intersecting, so the observer never fires.
    const fallback = window.setTimeout(() => {
      setIsVisible(true)
      observer.disconnect()
    }, 900)

    return () => {
      observer.disconnect()
      window.clearTimeout(fallback)
    }
  }, [])

  return (
    <div
      ref={ref}
      className={`${className} ${isVisible ? 'animate-fade-in-up' : 'opacity-0'}`}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  )
}
