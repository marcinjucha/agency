import { describe, it, expect } from 'vitest'
// Importing the barrel triggers the side-effect registration on module load
// (index.server.ts calls registerEspProvider(beehiivProvider)).
import { getEspProvider } from '../index.server'
import { beehiivProvider } from '../beehiiv.server'
import type { EspProviderId } from '../types'

describe('esp registry', () => {
  it('resolves the registered beehiiv provider via the barrel side-effect', () => {
    expect(getEspProvider('beehiiv')).toBe(beehiivProvider)
  })

  it('throws for an unregistered provider id', () => {
    expect(() => getEspProvider('nope' as EspProviderId)).toThrow()
  })
})
