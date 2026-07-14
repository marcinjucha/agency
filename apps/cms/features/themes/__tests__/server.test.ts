import { describe, it, expect, vi, beforeEach } from 'vitest'
import { okAsync } from 'neverthrow'
import { messages } from '@/lib/messages'

// Mock ONLY requireAuthContextFull — the createServerFn wrappers' auth() gate
// routes through it; hasPermission stays the REAL implementation so the
// `design.themes` check under test is faithful. The pure-handler tests below
// never call auth(), so this mock is inert for them.
vi.mock('@/lib/server-auth.server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/server-auth.server')>()
  return { ...actual, requireAuthContextFull: vi.fn() }
})

import { requireAuthContextFull } from '@/lib/server-auth.server'
import {
  createTheme,
  createThemeFn,
  deleteTheme,
  deleteThemeFn,
  duplicateTheme,
  duplicateThemeFn,
  getThemeFn,
  getThemeReferences,
  getThemeUsage,
  getThemeUsageFn,
  listThemes,
  listThemesFn,
  uniqueCopyName,
  updateTheme,
  updateThemeFn,
} from '../server'

// ---------------------------------------------------------------------------
// Theme Manager (iter D2) — named-theme CRUD handler tests.
//
// Targets the PURE handlers in server.ts directly (supabase injected) — same
// pattern as features/venture/server.ts tests. A per-table mock: so_themes
// carries several distinct ops (list / get / insert / update / delete / names),
// disambiguated by which entry method (select/insert/update/delete) is called
// and which terminal (order/maybeSingle/single/thenable) resolves. so_clients +
// tenants back the reverse-FK usage + delete-guard counts.
// ---------------------------------------------------------------------------

const TENANT = 'tenant-1'

type Res = { data: unknown; error: { message?: string; code?: string } | null }

interface Cfg {
  themesList?: Res // so_themes .select().eq().order()   (listThemes)
  themeRow?: Res // so_themes .select().eq().eq().maybeSingle() (getTheme)
  themeInsert?: Res // so_themes .insert().select().single()
  themeUpdate?: Res // so_themes .update().eq().eq().select().single()
  themeDelete?: { error: unknown } // so_themes .delete().eq().eq()
  themeNames?: Res // so_themes .select('name').eq()  (fetchThemeNames — thenable)
  clients?: Res // so_clients .select().eq()[.eq()]   (usage OR references)
  tenants?: Res // tenants .select('id').eq('theme_id')
  campaigns?: Res // so_campaigns .select().eq('theme_id') OR .in('theme_id')
  emailTemplates?: Res // email_templates .select().eq('tenant_id').eq('theme_id') OR .eq('tenant_id')
}

function makeClient(cfg: Cfg) {
  const insertChain = {
    select: vi.fn(() => insertChain),
    single: vi.fn(() => Promise.resolve(cfg.themeInsert ?? { data: null, error: null })),
  }
  const updateChain = {
    eq: vi.fn(() => updateChain),
    select: vi.fn(() => updateChain),
    single: vi.fn(() => Promise.resolve(cfg.themeUpdate ?? { data: null, error: null })),
  }
  const deleteChain = {
    eq: vi.fn(() => deleteChain),
    then: (resolve: (v: unknown) => unknown) =>
      Promise.resolve(cfg.themeDelete ?? { error: null }).then(resolve),
  }
  const selectChain = {
    eq: vi.fn(() => selectChain),
    order: vi.fn(() => Promise.resolve(cfg.themesList ?? { data: [], error: null })),
    maybeSingle: vi.fn(() => Promise.resolve(cfg.themeRow ?? { data: null, error: null })),
    then: (resolve: (v: unknown) => unknown) =>
      Promise.resolve(cfg.themeNames ?? { data: [], error: null }).then(resolve),
  }
  const themesBuilder = {
    select: vi.fn(() => selectChain),
    insert: vi.fn(() => insertChain),
    update: vi.fn(() => updateChain),
    delete: vi.fn(() => deleteChain),
  }

  const clientsChain = {
    eq: vi.fn(() => clientsChain),
    then: (resolve: (v: unknown) => unknown) =>
      Promise.resolve(cfg.clients ?? { data: [], error: null }).then(resolve),
  }
  const clientsBuilder = { select: vi.fn(() => clientsChain) }

  const tenantsChain = {
    eq: vi.fn(() => tenantsChain),
    then: (resolve: (v: unknown) => unknown) =>
      Promise.resolve(cfg.tenants ?? { data: [], error: null }).then(resolve),
  }
  const tenantsBuilder = { select: vi.fn(() => tenantsChain) }

  const campaignsChain = {
    eq: vi.fn(() => campaignsChain),
    in: vi.fn(() => campaignsChain),
    then: (resolve: (v: unknown) => unknown) =>
      Promise.resolve(cfg.campaigns ?? { data: [], error: null }).then(resolve),
  }
  const campaignsBuilder = { select: vi.fn(() => campaignsChain) }

  const emailTemplatesChain = {
    eq: vi.fn(() => emailTemplatesChain),
    then: (resolve: (v: unknown) => unknown) =>
      Promise.resolve(cfg.emailTemplates ?? { data: [], error: null }).then(resolve),
  }
  const emailTemplatesBuilder = { select: vi.fn(() => emailTemplatesChain) }

  const from = vi.fn((table: string) => {
    switch (table) {
      case 'so_themes':
        return themesBuilder
      case 'so_clients':
        return clientsBuilder
      case 'tenants':
        return tenantsBuilder
      case 'so_campaigns':
        return campaignsBuilder
      case 'email_templates':
        return emailTemplatesBuilder
      default:
        throw new Error(`unexpected table ${table}`)
    }
  })

  return {
    from,
    themesBuilder,
    selectChain,
    insertChain,
    updateChain,
    deleteChain,
    clientsBuilder,
    tenantsBuilder,
    campaignsBuilder,
    campaignsChain,
    emailTemplatesBuilder,
    emailTemplatesChain,
  }
}

const INPUT = { name: 'Navy', tokens: { primary: '#123456' } } as never

describe('createTheme', () => {
  it('inserts a tenant-scoped theme and returns the narrowed row', async () => {
    const supabase = makeClient({
      themeInsert: {
        data: { id: 't1', tenant_id: TENANT, name: 'Navy', tokens: { primary: '#123456' } },
        error: null,
      },
    })
    const result = await createTheme(supabase as never, TENANT, INPUT)
    expect(result).toEqual({
      success: true,
      data: { id: 't1', tenant_id: TENANT, name: 'Navy', tokens: { primary: '#123456' } },
    })
    expect(supabase.themesBuilder.insert).toHaveBeenCalledWith({
      tenant_id: TENANT,
      name: 'Navy',
      tokens: { primary: '#123456' },
    })
  })

  it('surfaces the `nameTaken` code on a unique-name violation (23505)', async () => {
    const supabase = makeClient({
      themeInsert: { data: null, error: { code: '23505', message: 'duplicate key' } },
    })
    const result = await createTheme(supabase as never, TENANT, INPUT)
    expect(result).toEqual({ success: false, error: 'nameTaken' })
  })
})

describe('updateTheme', () => {
  it('double-scopes the update by id AND tenant_id', async () => {
    const supabase = makeClient({
      themeUpdate: {
        data: { id: 't1', tenant_id: TENANT, name: 'Navy 2', tokens: {} },
        error: null,
      },
    })
    const result = await updateTheme(supabase as never, TENANT, 't1', {
      name: 'Navy 2',
      tokens: {},
    } as never)
    expect(result).toMatchObject({ success: true })
    expect(supabase.updateChain.eq).toHaveBeenCalledWith('id', 't1')
    expect(supabase.updateChain.eq).toHaveBeenCalledWith('tenant_id', TENANT)
  })
})

describe('listThemes', () => {
  it('returns themes with per-theme client AND campaign usage counts', async () => {
    const supabase = makeClient({
      themesList: {
        data: [
          { id: 't1', tenant_id: TENANT, name: 'A', tokens: {} },
          { id: 't2', tenant_id: TENANT, name: 'B', tokens: {} },
        ],
        error: null,
      },
      // two clients on t1, none on t2
      clients: { data: [{ theme_id: 't1' }, { theme_id: 't1' }, { theme_id: null }], error: null },
      // one campaign on t1, two on t2
      campaigns: {
        data: [{ theme_id: 't1' }, { theme_id: 't2' }, { theme_id: 't2' }],
        error: null,
      },
      // one email template on t1, none on t2
      emailTemplates: { data: [{ theme_id: 't1' }], error: null },
    })
    const result = await listThemes(supabase as never, TENANT)
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({
      id: 't1',
      usedBy: { clients: 2, campaigns: 1, emailTemplates: 1 },
    })
    expect(result[1]).toMatchObject({
      id: 't2',
      usedBy: { clients: 0, campaigns: 2, emailTemplates: 0 },
    })
    // Campaigns scoped by the tenant's theme ids (no tenant_id column on so_campaigns).
    expect(supabase.campaignsBuilder.select).toHaveBeenCalledWith('theme_id')
  })

  it('returns [] without usage queries when there are no themes', async () => {
    const supabase = makeClient({ themesList: { data: [], error: null } })
    const result = await listThemes(supabase as never, TENANT)
    expect(result).toEqual([])
    expect(supabase.clientsBuilder.select).not.toHaveBeenCalled()
    expect(supabase.campaignsBuilder.select).not.toHaveBeenCalled()
    expect(supabase.emailTemplatesBuilder.select).not.toHaveBeenCalled()
  })
})

describe('deleteTheme (delete guard)', () => {
  it('blocks deletion and returns dependents when the theme is still referenced', async () => {
    const supabase = makeClient({
      clients: { data: [{ id: 'c1' }], error: null }, // 1 client references it
      tenants: { data: [{ id: TENANT }], error: null }, // + the org default
    })
    const result = await deleteTheme(supabase as never, TENANT, 't1')
    expect(result).toEqual({
      success: false,
      error: 'themeInUse',
      usedBy: { clients: 1, tenants: 1, campaigns: 0, emailTemplates: 0 },
    })
    // Guard blocks BEFORE any delete call.
    expect(supabase.themesBuilder.delete).not.toHaveBeenCalled()
  })

  it('blocks deletion when ONLY a campaign references it', async () => {
    const supabase = makeClient({
      clients: { data: [], error: null },
      tenants: { data: [], error: null },
      campaigns: { data: [{ id: 'camp-1' }], error: null }, // sole dependent
    })
    const result = await deleteTheme(supabase as never, TENANT, 't1')
    expect(result).toEqual({
      success: false,
      error: 'themeInUse',
      usedBy: { clients: 0, tenants: 0, campaigns: 1, emailTemplates: 0 },
    })
    expect(supabase.themesBuilder.delete).not.toHaveBeenCalled()
  })

  // DEFECT #1 regression — a theme in use by an email template MUST block delete.
  // Before the fix getThemeReferences never counted email_templates, so this
  // path returned `{ success: true }` and silently nulled the template's theme.
  it('blocks deletion when ONLY an email template references it', async () => {
    const supabase = makeClient({
      clients: { data: [], error: null },
      tenants: { data: [], error: null },
      campaigns: { data: [], error: null },
      emailTemplates: { data: [{ id: 'tmpl-1' }], error: null }, // sole dependent
    })
    const result = await deleteTheme(supabase as never, TENANT, 't1')
    expect(result).toEqual({
      success: false,
      error: 'themeInUse',
      usedBy: { clients: 0, tenants: 0, campaigns: 0, emailTemplates: 1 },
    })
    expect(supabase.themesBuilder.delete).not.toHaveBeenCalled()
  })

  it('deletes when unreferenced (double-scoped by id + tenant_id)', async () => {
    const supabase = makeClient({
      clients: { data: [], error: null },
      tenants: { data: [], error: null },
      campaigns: { data: [], error: null },
      themeDelete: { error: null },
    })
    const result = await deleteTheme(supabase as never, TENANT, 't1')
    expect(result).toEqual({ success: true })
    expect(supabase.themesBuilder.delete).toHaveBeenCalledTimes(1)
    expect(supabase.deleteChain.eq).toHaveBeenCalledWith('id', 't1')
    expect(supabase.deleteChain.eq).toHaveBeenCalledWith('tenant_id', TENANT)
  })
})

describe('getThemeReferences', () => {
  it('counts clients, tenants, campaigns, AND email templates referencing the theme', async () => {
    const supabase = makeClient({
      clients: { data: [{ id: 'c1' }, { id: 'c2' }], error: null },
      tenants: { data: [{ id: TENANT }], error: null },
      campaigns: { data: [{ id: 'camp-1' }, { id: 'camp-2' }, { id: 'camp-3' }], error: null },
      emailTemplates: { data: [{ id: 'tmpl-1' }, { id: 'tmpl-2' }], error: null },
    })
    const refs = await getThemeReferences(supabase as never, TENANT, 't1')
    expect(refs).toEqual({ clients: 2, tenants: 1, campaigns: 3, emailTemplates: 2 })
    expect(supabase.campaignsChain.eq).toHaveBeenCalledWith('theme_id', 't1')
    expect(supabase.emailTemplatesChain.eq).toHaveBeenCalledWith('theme_id', 't1')
    expect(supabase.emailTemplatesChain.eq).toHaveBeenCalledWith('tenant_id', TENANT)
  })

  // DEFECT #1 (failing-first): a theme referenced ONLY by an email template must
  // report a non-zero emailTemplates count. Pinned separately from the combined
  // test above so a regression is unambiguous.
  it('returns a non-zero email-template count when a template references the theme', async () => {
    const supabase = makeClient({
      clients: { data: [], error: null },
      tenants: { data: [], error: null },
      campaigns: { data: [], error: null },
      emailTemplates: { data: [{ id: 'tmpl-1' }], error: null },
    })
    const refs = await getThemeReferences(supabase as never, TENANT, 't1')
    expect(refs.emailTemplates).toBe(1)
  })
})

describe('duplicateTheme', () => {
  it('copies tokens under a unique "(kopia)" name', async () => {
    const supabase = makeClient({
      themeRow: {
        data: { id: 't1', tenant_id: TENANT, name: 'Navy', tokens: { primary: '#123456' } },
        error: null,
      },
      themeNames: { data: [{ name: 'Navy' }, { name: 'Navy (kopia)' }], error: null },
      themeInsert: {
        data: { id: 't9', tenant_id: TENANT, name: 'Navy (kopia 2)', tokens: { primary: '#123456' } },
        error: null,
      },
    })
    const result = await duplicateTheme(supabase as never, TENANT, 't1')
    expect(result).toMatchObject({ success: true })
    // "Navy (kopia)" is taken → falls to "(kopia 2)".
    expect(supabase.themesBuilder.insert).toHaveBeenCalledWith({
      tenant_id: TENANT,
      name: 'Navy (kopia 2)',
      tokens: { primary: '#123456' },
    })
  })

  it('fails cleanly when the original theme is missing', async () => {
    const supabase = makeClient({ themeRow: { data: null, error: null } })
    const result = await duplicateTheme(supabase as never, TENANT, 'missing')
    expect(result).toMatchObject({ success: false })
    expect(supabase.themesBuilder.insert).not.toHaveBeenCalled()
  })
})

describe('uniqueCopyName (pure)', () => {
  it('uses "(kopia)" when free', () => {
    expect(uniqueCopyName('Navy', [])).toBe('Navy (kopia)')
  })
  it('increments past case-insensitive collisions', () => {
    expect(uniqueCopyName('Navy', ['navy (kopia)', 'NAVY (KOPIA 2)'])).toBe('Navy (kopia 3)')
  })
})

describe('getThemeUsage', () => {
  it('counts clients, campaigns AND email templates for a given theme id', async () => {
    const supabase = makeClient({
      clients: { data: [{ id: 'c1' }, { id: 'c2' }], error: null },
      campaigns: { data: [{ id: 'camp-1' }], error: null },
      emailTemplates: { data: [{ id: 'tmpl-1' }, { id: 'tmpl-2' }, { id: 'tmpl-3' }], error: null },
    })
    const usage = await getThemeUsage(supabase as never, TENANT, 't1')
    expect(usage).toEqual({ clients: 2, campaigns: 1, emailTemplates: 3 })
    expect(supabase.campaignsChain.eq).toHaveBeenCalledWith('theme_id', 't1')
    expect(supabase.emailTemplatesChain.eq).toHaveBeenCalledWith('theme_id', 't1')
  })

  it('returns zero counts without a query when no id is given', async () => {
    const supabase = makeClient({})
    const usage = await getThemeUsage(supabase as never, TENANT, undefined)
    expect(usage).toEqual({ clients: 0, campaigns: 0, emailTemplates: 0 })
    expect(supabase.clientsBuilder.select).not.toHaveBeenCalled()
    expect(supabase.campaignsBuilder.select).not.toHaveBeenCalled()
    expect(supabase.emailTemplatesBuilder.select).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// Permission gate (P1) — every createServerFn wrapper requires `design.themes`.
// The wrappers funnel through auth() (requireAuthContextFull → hasPermission);
// the extractedFn runs the handler directly in-process under vitest, so the
// wrappers are invocable. A caller WITHOUT the key is rejected BEFORE any DB
// access (reads gated too — the sidebar hides the section for such users).
// ---------------------------------------------------------------------------

const mockAuth = requireAuthContextFull as ReturnType<typeof vi.fn>
const UUID = '00000000-0000-4000-8000-000000000000'
const VALID_INPUT = { name: 'Navy', tokens: { primary: '#123456' } }

function authCtx(permissions: string[], supabase: unknown) {
  return okAsync({
    supabase,
    userId: 'user-1',
    tenantId: TENANT,
    isSuperAdmin: false,
    roleName: 'member',
    permissions,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('design.themes gate — rejects a caller without the permission', () => {
  const calls: Array<[string, () => Promise<unknown>]> = [
    ['listThemesFn', () => (listThemesFn as (a?: unknown) => Promise<unknown>)()],
    ['getThemeFn', () => (getThemeFn as (a: unknown) => Promise<unknown>)({ data: { id: UUID } })],
    [
      'createThemeFn',
      () => (createThemeFn as (a: unknown) => Promise<unknown>)({ data: VALID_INPUT }),
    ],
    [
      'updateThemeFn',
      () =>
        (updateThemeFn as (a: unknown) => Promise<unknown>)({
          data: { id: UUID, data: VALID_INPUT },
        }),
    ],
    ['deleteThemeFn', () => (deleteThemeFn as (a: unknown) => Promise<unknown>)({ data: { id: UUID } })],
    [
      'duplicateThemeFn',
      () => (duplicateThemeFn as (a: unknown) => Promise<unknown>)({ data: { id: UUID } }),
    ],
    [
      'getThemeUsageFn',
      () => (getThemeUsageFn as (a: unknown) => Promise<unknown>)({ data: { id: UUID } }),
    ],
  ]

  it.each(calls)('%s rejects and never touches the DB', async (_name, call) => {
    const dummy = { from: vi.fn() }
    mockAuth.mockReturnValue(authCtx([], dummy)) // no design.themes
    await expect(call()).rejects.toThrow(messages.common.noPermission)
    expect(dummy.from).not.toHaveBeenCalled()
  })
})

// The createServerFn wrapper does NOT round-trip its resolved VALUE when invoked
// in-process under vitest (returns undefined; only throws propagate — the CMS
// "createServerFn returns undefined" gotcha). So the allow-path asserts on the
// side effect that proves the gate PASSED: the handler was reached and hit the
// DB (supabase.from called), and the call resolved rather than rejected.
describe('design.themes gate — allows a caller holding the permission', () => {
  it('listThemesFn reaches the DB', async () => {
    const supabase = makeClient({ themesList: { data: [], error: null } })
    mockAuth.mockReturnValue(authCtx(['design.themes'], supabase))
    await (listThemesFn as (a?: unknown) => Promise<unknown>)()
    expect(supabase.from).toHaveBeenCalledWith('so_themes')
  })

  it('getThemeFn reaches the DB', async () => {
    const supabase = makeClient({
      themeRow: { data: { id: UUID, tenant_id: TENANT, name: 'A', tokens: {} }, error: null },
    })
    mockAuth.mockReturnValue(authCtx(['design.themes'], supabase))
    await (getThemeFn as (a: unknown) => Promise<unknown>)({ data: { id: UUID } })
    expect(supabase.from).toHaveBeenCalledWith('so_themes')
  })

  it('createThemeFn reaches the DB (insert)', async () => {
    const supabase = makeClient({
      themeInsert: { data: { id: UUID, tenant_id: TENANT, name: 'Navy', tokens: {} }, error: null },
    })
    mockAuth.mockReturnValue(authCtx(['design.themes'], supabase))
    await (createThemeFn as (a: unknown) => Promise<unknown>)({ data: VALID_INPUT })
    expect(supabase.themesBuilder.insert).toHaveBeenCalled()
  })

  it('updateThemeFn reaches the DB (update)', async () => {
    const supabase = makeClient({
      themeUpdate: { data: { id: UUID, tenant_id: TENANT, name: 'Navy', tokens: {} }, error: null },
    })
    mockAuth.mockReturnValue(authCtx(['design.themes'], supabase))
    await (updateThemeFn as (a: unknown) => Promise<unknown>)({ data: { id: UUID, data: VALID_INPUT } })
    expect(supabase.themesBuilder.update).toHaveBeenCalled()
  })

  it('deleteThemeFn reaches the DB (delete, unreferenced)', async () => {
    const supabase = makeClient({
      clients: { data: [], error: null },
      tenants: { data: [], error: null },
      themeDelete: { error: null },
    })
    mockAuth.mockReturnValue(authCtx(['design.themes'], supabase))
    await (deleteThemeFn as (a: unknown) => Promise<unknown>)({ data: { id: UUID } })
    expect(supabase.themesBuilder.delete).toHaveBeenCalledTimes(1)
  })

  it('duplicateThemeFn reaches the DB (insert copy)', async () => {
    const supabase = makeClient({
      themeRow: { data: { id: UUID, tenant_id: TENANT, name: 'Navy', tokens: {} }, error: null },
      themeNames: { data: [], error: null },
      themeInsert: {
        data: { id: 't9', tenant_id: TENANT, name: 'Navy (kopia)', tokens: {} },
        error: null,
      },
    })
    mockAuth.mockReturnValue(authCtx(['design.themes'], supabase))
    await (duplicateThemeFn as (a: unknown) => Promise<unknown>)({ data: { id: UUID } })
    expect(supabase.themesBuilder.insert).toHaveBeenCalled()
  })

  it('getThemeUsageFn reaches the DB', async () => {
    const supabase = makeClient({ clients: { data: [{ id: 'c1' }], error: null } })
    mockAuth.mockReturnValue(authCtx(['design.themes'], supabase))
    await (getThemeUsageFn as (a: unknown) => Promise<unknown>)({ data: { id: UUID } })
    expect(supabase.from).toHaveBeenCalledWith('so_clients')
  })

  it('grants via the parent `design` key (prefix match)', async () => {
    const supabase = makeClient({ themesList: { data: [], error: null } })
    mockAuth.mockReturnValue(authCtx(['design'], supabase))
    await (listThemesFn as (a?: unknown) => Promise<unknown>)()
    expect(supabase.from).toHaveBeenCalledWith('so_themes')
  })
})
