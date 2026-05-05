import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDocumentVisible } from '../use-document-visible'

// `document.visibilityState` is a getter — not assignable directly.
// Use Object.defineProperty with `configurable: true` so subsequent tests
// can override the value without "Cannot redefine property" errors.
function setVisibilityState(value: DocumentVisibilityState): void {
  Object.defineProperty(document, 'visibilityState', {
    value,
    configurable: true,
  })
}

describe('useDocumentVisible', () => {
  afterEach(() => {
    // Reset to a known good baseline between tests so initial-state assertions
    // don't leak from a prior test's override.
    setVisibilityState('visible')
  })

  it('returns true when document is initially visible', () => {
    setVisibilityState('visible')

    const { result } = renderHook(() => useDocumentVisible())

    expect(result.current).toBe(true)
  })

  it('returns false when document is initially hidden', () => {
    setVisibilityState('hidden')

    const { result } = renderHook(() => useDocumentVisible())

    expect(result.current).toBe(false)
  })

  it('re-evaluates when visibilitychange event fires', () => {
    setVisibilityState('visible')
    const { result } = renderHook(() => useDocumentVisible())
    expect(result.current).toBe(true)

    act(() => {
      setVisibilityState('hidden')
      document.dispatchEvent(new Event('visibilitychange'))
    })

    expect(result.current).toBe(false)
  })

  it('removes the visibilitychange listener on unmount', () => {
    const addSpy = vi.spyOn(document, 'addEventListener')
    const removeSpy = vi.spyOn(document, 'removeEventListener')

    const { unmount } = renderHook(() => useDocumentVisible())

    const addCall = addSpy.mock.calls.find(([event]) => event === 'visibilitychange')
    expect(addCall).toBeDefined()
    const registeredHandler = addCall?.[1]

    unmount()

    const removeCall = removeSpy.mock.calls.find(([event]) => event === 'visibilitychange')
    expect(removeCall).toBeDefined()
    expect(removeCall?.[1]).toBe(registeredHandler)
  })

  it('treats prerender as not visible', () => {
    setVisibilityState('prerender')

    const { result } = renderHook(() => useDocumentVisible())

    expect(result.current).toBe(false)
  })
})
