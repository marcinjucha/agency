import { describe, it, expect, vi, beforeEach } from 'vitest'
import { okAsync } from 'neverthrow'
import { messages } from '@/lib/messages'

// Mock ONLY requireAuthContextFull — `hasPermission` stays REAL so the
// `system.email_templates` gate under test is faithful.
vi.mock('@/lib/server-auth.server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/server-auth.server')>()
  return { ...actual, requireAuthContextFull: vi.fn() }
})

// The bake pipeline is exercised by its own suites; here we only assert that the
// duplicate RE-BAKES rather than copying the stored html_body.
vi.mock('../render.server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../render.server')>()
  return { ...actual, renderEmailBlocks: vi.fn(async () => '<baked/>') }
})
vi.mock('../utils/resolve-tenant-theme.server', () => ({
  resolveEmailThemeMap: vi.fn(async () => ({ primary: '#f60' })),
}))

import { requireAuthContextFull } from '@/lib/server-auth.server'
import { renderEmailBlocks } from '../render.server'
import { resolveEmailThemeMap } from '../utils/resolve-tenant-theme.server'
import { duplicateTemplate, duplicateEmailTemplateFn } from '../server'

const TENANT = 'tenant-1'
const SOURCE_ID = '11111111-1111-4111-8111-111111111111'

type Res = { data: unknown; error: { code?: string; message?: string } | null }

interface Cfg {
  source?: Res // email_templates .select(…).eq().eq().maybeSingle()
  siblings?: Res // email_templates .select('type, label').eq()  (awaited)
  insert?: { error: unknown } // email_templates .insert()
  theme?: Res // so_themes .select('id').eq().eq().maybeSingle()
}

function makeClient(cfg: Cfg) {
  const calls = {
    selects: [] as string[],
    eqs: [] as [string, unknown][],
    inserted: undefined as Record<string, unknown> | undefined,
  }

  const templatesSelect = () => {
    const builder: Record<string, unknown> = {
      eq: (col: string, val: unknown) => {
        calls.eqs.push([col, val])
        return builder
      },
      maybeSingle: async () => cfg.source ?? { data: null, error: null },
      then: (resolve: (r: Res) => unknown) =>
        Promise.resolve(cfg.siblings ?? { data: [], error: null }).then(resolve),
    }
    return builder
  }

  const themesSelect = () => {
    const builder: Record<string, unknown> = {
      eq: () => builder,
      maybeSingle: async () => cfg.theme ?? { data: { id: 'theme-1' }, error: null },
    }
    return builder
  }

  const client = {
    from: (table: string) => ({
      select: (cols: string) => {
        calls.selects.push(cols)
        return table === 'so_themes' ? themesSelect() : templatesSelect()
      },
      insert: async (payload: Record<string, unknown>) => {
        calls.inserted = payload
        return cfg.insert ?? { error: null }
      },
    }),
  }

  return { client, calls }
}

const authCtx = (client: unknown) => ({
  supabase: client as never,
  userId: 'u1',
  tenantId: TENANT,
  isSuperAdmin: false,
  roleName: 'member',
  permissions: ['system.email_templates'] as never,
})

const sourceRow = (over: Record<string, unknown> = {}) => ({
  data: {
    type: 'form_confirmation',
    label: 'Potwierdzenie formularza',
    subject: 'Dziękujemy',
    blocks: [{ id: 'b1', type: 'text', content: 'Cześć' }],
    template_variables: [{ key: 'firstName', label: 'Imię' }],
    theme_id: 'theme-1',
    is_active: true,
    ...over,
  },
  error: null,
})

beforeEach(() => vi.clearAllMocks())

describe('duplicateTemplate — source read', () => {
  it('keys the source by id, never by type', async () => {
    const { client, calls } = makeClient({ source: sourceRow() })
    await duplicateTemplate(authCtx(client), SOURCE_ID)

    expect(calls.eqs).toContainEqual(['id', SOURCE_ID])
    expect(calls.eqs).toContainEqual(['tenant_id', TENANT])
    expect(calls.eqs.map(([col]) => col)).not.toContain('type')
  })

  it('never projects html_body or the dead name column', async () => {
    const { client, calls } = makeClient({ source: sourceRow() })
    await duplicateTemplate(authCtx(client), SOURCE_ID)

    const projection = calls.selects.join(' ')
    expect(projection).not.toMatch(/html_body/)
    expect(projection).not.toMatch(/\bname\b/)
    expect(projection).toMatch(/is_active/)
  })

  it("returns noPermission for another tenant's row (no existence oracle)", async () => {
    const { client } = makeClient({ source: { data: null, error: null } })
    const result = await duplicateTemplate(authCtx(client), SOURCE_ID)

    expect(result.isErr()).toBe(true)
    expect(result._unsafeUnwrapErr()).toBe(messages.common.noPermission)
  })

  it('rejects a cross-tenant theme_id before inserting', async () => {
    const { client, calls } = makeClient({
      source: sourceRow(),
      theme: { data: null, error: null },
    })
    const result = await duplicateTemplate(authCtx(client), SOURCE_ID)

    expect(result.isErr()).toBe(true)
    expect(result._unsafeUnwrapErr()).toBe(messages.common.noPermission)
    expect(calls.inserted).toBeUndefined()
  })
})

describe('duplicateTemplate — payload', () => {
  it('re-bakes html_body with the COPIED theme_id and never reads the stored one', async () => {
    const { client, calls } = makeClient({ source: sourceRow() })
    await duplicateTemplate(authCtx(client), SOURCE_ID)

    expect(resolveEmailThemeMap).toHaveBeenCalledWith(expect.anything(), {
      tenantId: TENANT,
      templateThemeId: 'theme-1',
    })
    expect(renderEmailBlocks).toHaveBeenCalledWith(
      [{ id: 'b1', type: 'text', content: 'Cześć' }],
      { primary: '#f60' },
    )
    expect(calls.inserted?.html_body).toBe('<baked/>')
  })

  it('carries subject, blocks, variables and theme_id from the source', async () => {
    const { client, calls } = makeClient({ source: sourceRow() })
    await duplicateTemplate(authCtx(client), SOURCE_ID)

    expect(calls.inserted).toMatchObject({
      tenant_id: TENANT,
      subject: 'Dziękujemy',
      blocks: [{ id: 'b1', type: 'text', content: 'Cześć' }],
      template_variables: [{ key: 'firstName', label: 'Imię' }],
      theme_id: 'theme-1',
    })
  })

  it('keeps an inactive template inactive (saveTemplate would force is_active true)', async () => {
    const { client, calls } = makeClient({ source: sourceRow({ is_active: false }) })
    await duplicateTemplate(authCtx(client), SOURCE_ID)

    expect(calls.inserted?.is_active).toBe(false)
  })

  it('names the copy and returns its new type', async () => {
    const { client, calls } = makeClient({ source: sourceRow() })
    const result = await duplicateTemplate(authCtx(client), SOURCE_ID)

    expect(calls.inserted?.label).toBe('Potwierdzenie formularza (kopia)')
    expect(calls.inserted?.type).toBe('form_confirmation_kopia')
    expect(result._unsafeUnwrap()).toEqual({ type: 'form_confirmation_kopia' })
  })

  it('increments past an existing copy', async () => {
    const { client, calls } = makeClient({
      source: sourceRow(),
      siblings: {
        data: [
          { type: 'form_confirmation', label: 'Potwierdzenie formularza' },
          { type: 'form_confirmation_kopia', label: 'Potwierdzenie formularza (kopia)' },
        ],
        error: null,
      },
    })
    await duplicateTemplate(authCtx(client), SOURCE_ID)

    expect(calls.inserted?.type).toBe('form_confirmation_kopia_2')
    expect(calls.inserted?.label).toBe('Potwierdzenie formularza (kopia 2)')
  })
})

describe('duplicateTemplate — length limits', () => {
  it('keeps a long label inside the zod .max(100) the editor re-validates on every save', async () => {
    const { client, calls } = makeClient({ source: sourceRow({ label: 'a'.repeat(95) }) })
    await duplicateTemplate(authCtx(client), SOURCE_ID)

    expect((calls.inserted?.label as string).length).toBeLessThanOrEqual(100)
  })

  it('keeps a long slug inside .max(50) and inside the slug grammar', async () => {
    const { client, calls } = makeClient({ source: sourceRow({ type: 'a'.repeat(48) }) })
    await duplicateTemplate(authCtx(client), SOURCE_ID)

    const type = calls.inserted?.type as string
    expect(type.length).toBeLessThanOrEqual(50)
    expect(type).toMatch(/^[a-z][a-z0-9_]*$/)
  })
})

describe('duplicateEmailTemplateFn — permission gate', () => {
  // The createServerFn wrapper does not return its handler's value outside a
  // real request context (same as features/themes/__tests__/server.test.ts), so
  // these assert SIDE EFFECTS: did the gate stop us before touching the DB?
  it('rejects a caller without system.email_templates and never touches the DB', async () => {
    const { client, calls } = makeClient({ source: sourceRow() })
    vi.mocked(requireAuthContextFull).mockReturnValue(
      okAsync({ ...authCtx(client), permissions: [] as never }),
    )

    // The wrapper surfaces the gate as a rejection in this environment; what the
    // test pins is that NOTHING reached the DB.
    await (duplicateEmailTemplateFn as (a: unknown) => Promise<unknown>)({
      data: { id: SOURCE_ID },
    }).catch(() => undefined)

    expect(calls.selects).toHaveLength(0)
    expect(calls.inserted).toBeUndefined()
  })

  it('reaches the insert for a caller holding the permission', async () => {
    const { client, calls } = makeClient({ source: sourceRow() })
    vi.mocked(requireAuthContextFull).mockReturnValue(okAsync(authCtx(client)))

    await (duplicateEmailTemplateFn as (a: unknown) => Promise<unknown>)({
      data: { id: SOURCE_ID },
    })

    expect(calls.inserted?.type).toBe('form_confirmation_kopia')
  })
})
