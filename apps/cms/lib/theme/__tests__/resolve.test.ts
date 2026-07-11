import { describe, expect, it } from 'vitest'
import { contrastRatio, HALO_EFEKT_DEFAULT, resolveClientTheme } from '../resolve'
import { brandToThemeTokens, hexColorSchema, parseThemeTokens } from '../validation'
import type { HexColor, ThemeTokens } from '../types'

// Test helper: build a ThemeTokens without fighting the HexColor brand. Values
// are cast because tests intentionally pass raw strings (incl. invalid ones).
function tokens(partial: Record<string, unknown>): ThemeTokens {
  return partial as ThemeTokens
}

describe('resolveClientTheme — no theme at all', () => {
  const resolved = resolveClientTheme({ tenantTheme: null, clientTheme: null })

  it('returns exactly the neutral Halo Efekt default', () => {
    expect(resolved).toEqual(HALO_EFEKT_DEFAULT)
  })

  it('reproduces the current bonus-email literals byte-for-byte (regression guard)', () => {
    // Source of truth: ../mail/bonus-email.ts + @agency/email defaults.
    expect(resolved.headerBackground).toBe('#1a1a2e')
    expect(resolved.headerText).toBe('#ffffff')
    // primary === the heading typography default the renderer actually applies
    // (DEFAULT_BLOCK_TYPOGRAPHY.heading.textColor). The heading now emits
    // textColor: theme.primary, so this value renders on the heading verbatim.
    expect(resolved.primary).toBe('#0f172a')
    expect(resolved.text).toBe('#334155') // body copy
    expect(resolved.footerText).toBe('#94a3b8')
  })
})

describe('resolveClientTheme — whole-object selection', () => {
  const fullClient = tokens({
    primary: '#111111',
    primaryText: '#222222',
    accent: '#333333',
    background: '#444444',
    text: '#555555',
    mutedText: '#666666',
    headerBackground: '#000000',
    headerText: '#ffffff', // high contrast so the guard leaves it untouched
    footerText: '#777777',
  })

  it('client fully set → client tokens win, zero tenant/default leakage', () => {
    const tenant = tokens({
      primary: '#aaaaaa',
      headerBackground: '#bbbbbb',
      text: '#cccccc',
    })
    const resolved = resolveClientTheme({ tenantTheme: tenant, clientTheme: fullClient })

    expect(resolved.primary).toBe('#111111')
    expect(resolved.accent).toBe('#333333')
    expect(resolved.text).toBe('#555555')
    expect(resolved.headerBackground).toBe('#000000')
    expect(resolved.footerText).toBe('#777777')
    // No tenant or default value leaked into any token.
    expect(resolved.text).not.toBe('#cccccc')
    expect(resolved.text).not.toBe(HALO_EFEKT_DEFAULT.text)
  })

  it('client PARTIAL → whole-object picks client; gaps backfill from DEFAULT, NOT tenant', () => {
    const tenant = tokens({
      primary: '#aaaaaa',
      text: '#cccccc',
      accent: '#dddddd',
    })
    const resolved = resolveClientTheme({
      tenantTheme: tenant,
      clientTheme: tokens({ primary: '#123456' }),
    })

    expect(resolved.primary).toBe('#123456') // client's one token wins
    // Missing tokens come from DEFAULT — the tenant brand must NOT leak in.
    expect(resolved.text).toBe(HALO_EFEKT_DEFAULT.text)
    expect(resolved.accent).toBe(HALO_EFEKT_DEFAULT.accent)
    expect(resolved.text).not.toBe('#cccccc')
    expect(resolved.accent).not.toBe('#dddddd')
  })

  it('tenant set, client null → tenant wins, gaps backfilled from default', () => {
    const tenant = tokens({ primary: '#abcabc', accent: '#defdef' })
    const resolved = resolveClientTheme({ tenantTheme: tenant, clientTheme: null })

    expect(resolved.primary).toBe('#abcabc')
    expect(resolved.accent).toBe('#defdef')
    expect(resolved.text).toBe(HALO_EFEKT_DEFAULT.text) // gap → default
  })
})

describe('resolveClientTheme — invalid tokens', () => {
  it('non-hex token (hsl/var) is treated as absent and backfilled; no leak in output', () => {
    const client = tokens({
      primary: '#123456', // valid → makes hasAnyToken true, selects client
      accent: 'hsl(200, 50%, 50%)', // invalid → backfilled
      text: 'var(--brand-text)', // invalid → backfilled
      background: 'rebeccapurple', // named colour, invalid → backfilled
    })
    const resolved = resolveClientTheme({ tenantTheme: null, clientTheme: client })

    expect(resolved.primary).toBe('#123456')
    expect(resolved.accent).toBe(HALO_EFEKT_DEFAULT.accent)
    expect(resolved.text).toBe(HALO_EFEKT_DEFAULT.text)
    expect(resolved.background).toBe(HALO_EFEKT_DEFAULT.background)

    const serialized = JSON.stringify(resolved)
    expect(serialized).not.toContain('hsl(')
    expect(serialized).not.toContain('var(')
    expect(serialized).not.toContain('rebeccapurple')
  })
})

describe('resolveClientTheme — header contrast guard', () => {
  it('flips unreadable white-on-white header text to a dark readable value', () => {
    const client = tokens({
      primary: '#123456', // selects client
      headerBackground: '#ffffff',
      headerText: '#ffffff', // white on white → fails contrast
    })
    const resolved = resolveClientTheme({ tenantTheme: null, clientTheme: client })

    expect(resolved.headerText).not.toBe('#ffffff')
    expect(contrastRatio(resolved.headerBackground, resolved.headerText)).toBeGreaterThanOrEqual(
      4.5,
    )
  })

  it('leaves an already-readable header pair untouched', () => {
    const client = tokens({
      primary: '#123456',
      headerBackground: '#1a1a2e',
      headerText: '#ffffff',
    })
    const resolved = resolveClientTheme({ tenantTheme: null, clientTheme: client })
    expect(resolved.headerText).toBe('#ffffff')
  })
})

describe('resolveClientTheme — logo / font (optional render branches)', () => {
  it('carries logoUrl/fontFamily from the selected source when present', () => {
    const client = tokens({
      primary: '#123456',
      logoUrl: 'https://cdn.example.com/logo.png',
      fontFamily: 'Inter, sans-serif',
    })
    const resolved = resolveClientTheme({ tenantTheme: null, clientTheme: client })
    expect(resolved.logoUrl).toBe('https://cdn.example.com/logo.png')
    expect(resolved.fontFamily).toBe('Inter, sans-serif')
  })

  it('omits logoUrl/fontFamily when the source has none (absence is a real branch)', () => {
    const resolved = resolveClientTheme({ tenantTheme: null, clientTheme: null })
    expect(resolved.logoUrl).toBeUndefined()
    expect(resolved.fontFamily).toBeUndefined()
  })

  it('selects a logo-only client override over a coloured tenant (P2 fix)', () => {
    // Client sets ONLY a logo — no colour token. It must still be selected as
    // the source so its logo survives; its colours backfill from DEFAULT, and
    // the tenant's colours must NOT leak in (a client override was present).
    const tenant = tokens({ primary: '#aaaaaa', text: '#cccccc' })
    const resolved = resolveClientTheme({
      tenantTheme: tenant,
      clientTheme: tokens({ logoUrl: 'https://x/logo.png' }),
    })

    expect(resolved.logoUrl).toBe('https://x/logo.png')
    expect(resolved.primary).toBe(HALO_EFEKT_DEFAULT.primary)
    expect(resolved.text).toBe(HALO_EFEKT_DEFAULT.text)
    expect(resolved.primary).not.toBe('#aaaaaa') // no tenant leak
    expect(resolved.text).not.toBe('#cccccc')
  })
})

describe('resolveClientTheme — campaign tier (3-tier selection)', () => {
  const client = tokens({ primary: '#c11e17' })
  const tenant = tokens({ primary: '#7e7e7e' })

  it('campaign override wins over client and tenant', () => {
    const campaign = tokens({ primary: '#123456', accent: '#654321' })
    const resolved = resolveClientTheme({
      tenantTheme: tenant,
      clientTheme: client,
      campaignTheme: campaign,
    })
    expect(resolved.primary).toBe('#123456')
    expect(resolved.accent).toBe('#654321')
    // Neither the client nor the tenant leaks into an untouched token.
    expect(resolved.primary).not.toBe('#c11e17')
    expect(resolved.primary).not.toBe('#7e7e7e')
    // A token neither the campaign nor anyone set backfills from DEFAULT.
    expect(resolved.text).toBe(HALO_EFEKT_DEFAULT.text)
  })

  it('empty campaign theme falls through to the client tier', () => {
    const resolved = resolveClientTheme({
      tenantTheme: tenant,
      clientTheme: client,
      campaignTheme: {},
    })
    expect(resolved.primary).toBe('#c11e17') // client wins
  })

  it('a logo-only campaign override still wins over a coloured client', () => {
    const resolved = resolveClientTheme({
      tenantTheme: tenant,
      clientTheme: client,
      campaignTheme: tokens({ logoUrl: 'https://cdn.example.com/campaign-logo.png' }),
    })
    expect(resolved.logoUrl).toBe('https://cdn.example.com/campaign-logo.png')
    // Campaign selected → its (absent) colours backfill from DEFAULT, NOT client.
    expect(resolved.primary).toBe(HALO_EFEKT_DEFAULT.primary)
    expect(resolved.primary).not.toBe('#c11e17')
  })
})

describe('resolveClientTheme — byte-identical for 2-tier callers (regression guard)', () => {
  // The campaign tier MUST be purely additive: any caller that omits
  // campaignTheme, or passes it as null/{}, must produce EXACTLY the pre-campaign
  // 2-tier output. Representative inputs across the selection branches.
  const cases: Array<{ name: string; tenantTheme: ThemeTokens | null; clientTheme: ThemeTokens | null }> = [
    { name: 'no theme at all', tenantTheme: null, clientTheme: null },
    { name: 'client wins', tenantTheme: tokens({ primary: '#aaaaaa' }), clientTheme: tokens({ primary: '#123456' }) },
    { name: 'tenant wins (client null)', tenantTheme: tokens({ primary: '#abcabc', accent: '#defdef' }), clientTheme: null },
    { name: 'logo-only client override', tenantTheme: tokens({ primary: '#aaaaaa' }), clientTheme: tokens({ logoUrl: 'https://x/logo.png' }) },
    { name: 'header contrast guard fires', tenantTheme: null, clientTheme: tokens({ primary: '#123456', headerBackground: '#ffffff', headerText: '#ffffff' }) },
  ]

  for (const { name, tenantTheme, clientTheme } of cases) {
    it(`omitting campaignTheme === passing null === passing {} — ${name}`, () => {
      const twoTier = resolveClientTheme({ tenantTheme, clientTheme })
      const nullCampaign = resolveClientTheme({ tenantTheme, clientTheme, campaignTheme: null })
      const emptyCampaign = resolveClientTheme({ tenantTheme, clientTheme, campaignTheme: {} })
      expect(nullCampaign).toEqual(twoTier)
      expect(emptyCampaign).toEqual(twoTier)
    })
  }
})

describe('brandToThemeTokens (legacy so_campaigns.brand → ThemeTokens adapter)', () => {
  it('maps a full brand blob onto theme tokens with snake→camel key remap', () => {
    const tokensOut = brandToThemeTokens({
      primary: '#123456',
      accent: '#654321',
      bg: '#ffffff',
      logo_url: 'https://cdn.example.com/logo.png',
      font: 'Inter, sans-serif',
    })
    expect(tokensOut.primary).toBe('#123456')
    expect(tokensOut.accent).toBe('#654321')
    expect(tokensOut.background).toBe('#ffffff') // bg → background
    expect(tokensOut.logoUrl).toBe('https://cdn.example.com/logo.png') // logo_url → logoUrl
    expect(tokensOut.fontFamily).toBe('Inter, sans-serif') // font → fontFamily
    // The brand carries no header/footer/text tokens — they stay absent.
    expect(tokensOut.headerBackground).toBeUndefined()
    expect(tokensOut.footerText).toBeUndefined()
  })

  it('drops invalid-hex colour values (hsl / empty string) — keeps the valid ones', () => {
    const tokensOut = brandToThemeTokens({
      primary: '#123456', // valid → kept
      accent: 'hsl(200, 50%, 50%)', // invalid → dropped
      bg: '', // invalid → dropped
    })
    expect(tokensOut.primary).toBe('#123456')
    expect(tokensOut.accent).toBeUndefined()
    expect(tokensOut.background).toBeUndefined()
    const serialized = JSON.stringify(tokensOut)
    expect(serialized).not.toContain('hsl(')
  })

  it('drops an invalid logo_url but KEEPS valid colors — output must pass whole-object parseThemeTokens', () => {
    // P2 regression: an invalid logo_url passed through unvalidated made the
    // whole-object themeTokensSchema.safeParse (inside fetchThemeTokens →
    // parseThemeTokens) FAIL → the entire campaign theme collapsed to {} and its
    // valid colors were silently discarded. The adapter must drop the bad field
    // so only-valid output survives the downstream whole-object re-validation.
    const brand = { primary: '#123456', accent: '#654321', logo_url: 'not-a-url' }
    const tokensOut = brandToThemeTokens(brand)
    expect(tokensOut.primary).toBe('#123456')
    expect(tokensOut.accent).toBe('#654321')
    expect(tokensOut.logoUrl).toBeUndefined() // invalid url dropped
    // CRITICAL: the downstream whole-object gate must NOT collapse the colors.
    const reValidated = parseThemeTokens(tokensOut as never)
    expect(reValidated.primary).toBe('#123456')
    expect(reValidated.accent).toBe('#654321')
    expect(reValidated).not.toEqual({})
  })

  it('keeps a valid logo_url', () => {
    const tokensOut = brandToThemeTokens({
      primary: '#123456',
      logo_url: 'https://cdn.example.com/logo.png',
    })
    expect(tokensOut.logoUrl).toBe('https://cdn.example.com/logo.png')
    // Still passes the whole-object gate.
    expect(parseThemeTokens(tokensOut as never).logoUrl).toBe('https://cdn.example.com/logo.png')
  })

  it('drops an empty-string font — output stays whole-object valid', () => {
    const tokensOut = brandToThemeTokens({ primary: '#123456', font: '   ' })
    expect(tokensOut.primary).toBe('#123456')
    expect(tokensOut.fontFamily).toBeUndefined()
  })

  it('returns {} for null / empty / garbage input (never throws)', () => {
    expect(brandToThemeTokens(null)).toEqual({})
    expect(brandToThemeTokens({})).toEqual({})
    expect(brandToThemeTokens(42 as never)).toEqual({})
    expect(brandToThemeTokens('not an object' as never)).toEqual({})
    expect(brandToThemeTokens([] as never)).toEqual({})
  })

  it('output flows cleanly through the resolver as a campaign source', () => {
    const campaignTheme = brandToThemeTokens({ primary: '#123456', bg: '#0a0a0a' })
    const resolved = resolveClientTheme({
      tenantTheme: null,
      clientTheme: tokens({ primary: '#999999' }),
      campaignTheme,
    })
    expect(resolved.primary).toBe('#123456') // campaign (from brand) wins
    expect(resolved.background).toBe('#0a0a0a')
  })
})

describe('hexColorSchema', () => {
  it('accepts #rgb and #rrggbb', () => {
    expect(hexColorSchema.safeParse('#fff').success).toBe(true)
    expect(hexColorSchema.safeParse('#1a1a2e').success).toBe(true)
  })

  it('rejects hsl(), rgb(), var(), and named colours', () => {
    expect(hexColorSchema.safeParse('hsl(0, 0%, 0%)').success).toBe(false)
    expect(hexColorSchema.safeParse('rgb(0,0,0)').success).toBe(false)
    expect(hexColorSchema.safeParse('var(--x)').success).toBe(false)
    expect(hexColorSchema.safeParse('red').success).toBe(false)
  })

  it('rejects unanchored / malformed hex', () => {
    expect(hexColorSchema.safeParse('#12').success).toBe(false)
    expect(hexColorSchema.safeParse('#1a1a2e ').success).toBe(false)
    expect(hexColorSchema.safeParse('1a1a2e').success).toBe(false)
    expect(hexColorSchema.safeParse('#zzzzzz').success).toBe(false)
  })
})

describe('parseThemeTokens (DB-boundary narrowing)', () => {
  it('returns {} for a malformed Json value', () => {
    expect(parseThemeTokens(42)).toEqual({})
    expect(parseThemeTokens('not an object')).toEqual({})
    expect(parseThemeTokens(null)).toEqual({})
    expect(parseThemeTokens(undefined)).toEqual({})
  })

  it('narrows a valid partial theme to typed tokens', () => {
    const parsed = parseThemeTokens({ primary: '#123456', logoUrl: 'https://x.dev/l.png' })
    expect(parsed.primary).toBe('#123456')
    expect(parsed.logoUrl).toBe('https://x.dev/l.png')
  })

  it('returns {} when any token is an invalid hex (malformed row → no theme)', () => {
    expect(parseThemeTokens({ primary: 'hsl(0,0%,0%)' })).toEqual({})
  })
})
