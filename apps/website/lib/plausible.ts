type PlausibleEventProps = {
  'CTA Clicked': { location: 'hero' | 'final_cta' | 'navbar' }
  'Survey Started': never
  'Survey Submitted': never
  'Booking Completed': never
}

type PlausibleEvent = keyof PlausibleEventProps

type PlausibleArgs = {
  [K in PlausibleEvent]: PlausibleEventProps[K] extends never
    ? [event: K]
    : [event: K, options: { props: PlausibleEventProps[K] }]
}

declare global {
  interface Window {
    plausible: {
      (...args: PlausibleArgs[PlausibleEvent]): void
      q?: unknown[][]
    }
  }
}

/**
 * Track a custom Plausible event.
 * Gracefully handles the case where the script hasn't loaded yet
 * by using the queue pattern recommended by Plausible.
 */
export function trackEvent<E extends PlausibleEvent>(
  ...args: PlausibleArgs[E]
): void {
  window.plausible =
    window.plausible ||
    function (...a: unknown[]) {
      ;(window.plausible.q = window.plausible.q || []).push(a)
    }
  ;(window.plausible as (...a: unknown[]) => void)(...args)
}
