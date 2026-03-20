'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

interface ScrollRevealProps {
  children: ReactNode
  className?: string
  delay?: number
}

type ObserverCallback = (entry: IntersectionObserverEntry) => void

const callbacks = new Map<Element, ObserverCallback>()

let sharedObserver: IntersectionObserver | null = null

function getSharedObserver(): IntersectionObserver {
  if (sharedObserver) return sharedObserver

  sharedObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const cb = callbacks.get(entry.target)
        if (cb) cb(entry)
      }
    },
    { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
  )

  return sharedObserver
}

/**
 * Wrapper that triggers a fade-in-up animation when the element
 * enters the viewport. Uses a shared singleton IntersectionObserver
 * for performance across many instances.
 */
export function ScrollReveal({ children, className = '', delay = 0 }: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = getSharedObserver()

    callbacks.set(el, (entry) => {
      if (entry.isIntersecting) {
        setIsVisible(true)
        observer.unobserve(el)
        callbacks.delete(el)
      }
    })

    observer.observe(el)

    return () => {
      observer.unobserve(el)
      callbacks.delete(el)
    }
  }, [])

  return (
    <div
      ref={ref}
      className={`${className} ${
        isVisible ? 'animate-fade-in-up' : 'opacity-0'
      }`}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  )
}
