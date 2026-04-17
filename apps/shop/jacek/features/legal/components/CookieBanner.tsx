import { useState, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { Button } from '@agency/ui'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'

const STORAGE_KEY = 'cookie-consent-dismissed'

export function CookieBanner() {
  const [show, setShow] = useState(false)
  const [animateIn, setAnimateIn] = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY)) return
    } catch {
      return
    }
    setShow(true)
    // Trigger animation after mount so the transition plays
    const id = requestAnimationFrame(() => setAnimateIn(true))
    return () => cancelAnimationFrame(id)
  }, [])

  function handleAccept() {
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      // Dismissed for this session only
    }
    setAnimateIn(false)
    // Wait for exit animation before unmounting
    setTimeout(() => setShow(false), 500)
  }

  if (!show) return null

  return (
    <div
      role="dialog"
      aria-label={messages.cookie.message}
      className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-500 ease-out ${
        animateIn
          ? 'translate-y-0 opacity-100'
          : 'translate-y-full opacity-0'
      }`}
    >
      <div className="border-t border-border/40 bg-background/80 backdrop-blur-2xl shadow-lg shadow-black/25">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <p className="text-sm text-muted-foreground">
              {messages.cookie.message}{' '}
              <Link
                to={routes.politykaPrywatnosci}
                className="text-primary underline underline-offset-4 decoration-primary/40 hover:decoration-primary transition-colors duration-200"
              >
                {messages.cookie.privacyLink}
              </Link>
            </p>

            <div className="flex items-center gap-3 shrink-0">
              <Link to={routes.politykaPrywatnosci} tabIndex={-1}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground"
                >
                  {messages.cookie.moreInfo}
                </Button>
              </Link>
              <Button
                size="sm"
                onClick={handleAccept}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {messages.cookie.accept}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
