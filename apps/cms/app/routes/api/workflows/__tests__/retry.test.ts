import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ok, err, okAsync, errAsync } from 'neverthrow'

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

// Extend the global vitest.setup.ts @tanstack/react-router mock with
// createFileRoute so the route module can be imported in tests.
vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    useNavigate: vi.fn(() => vi.fn()),
    useSearch: vi.fn(() => ({})),
    useLocation: vi.fn(() => ({
      pathname: '/',
      search: '',
      hash: '',
      href: '/',
      searchStr: '',
      state: {},
    })),
    useRouterState: vi.fn(() => '/'),
    Link: vi.fn(({ children }: { children: unknown }) => children),
    createFileRoute: vi.fn(() => (config: unknown) => config),
  }
})

vi.mock('@/lib/server-auth', () => ({
  requireAuthContextFull: vi.fn(),
  hasPermission: vi.fn(),
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(),
}))

vi.mock('@/features/workflows/server', () => ({
  dispatchToN8n: vi.fn(),
}))

import { handleRetryPost } from '../retry'
import { requireAuthContextFull, hasPermission } from '@/lib/server-auth'
import { createServiceClient } from '@/lib/supabase/service'
import { dispatchToN8n } from '@/features/workflows/server'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TENANT_ID = 'tenant-aaa'
const USER_ID = 'user-bbb'
const EXECUTION_ID = '11111111-1111-1111-1111-111111111111'
const WORKFLOW_ID = 'wf-22222222-2222-2222-2222-222222222222'

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

function makeAuthFull(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    userId: USER_ID,
    tenantId: TENANT_ID,
    isSuperAdmin: false,
    roleName: 'admin',
    permissions: ['workflows', 'workflows.execute'],
    supabase: {} as never,
    ...overrides,
  }
}

/**
 * Builds a minimal Supabase service client mock.
 *
 * call order on `from()`:
 *   1 → SELECT (returns executionRow or null)
 *   2 → UPDATE optimistic lock (returns locked row or null based on lockSuccess)
 *   3 → UPDATE rollback (no-op resolve)
 */
function createMockServiceClient({
  executionRow = null as Record<string, unknown> | null,
  lockSuccess = true,
  lockError = null as { message: string } | null,
} = {}) {
  // SELECT chain
  const maybeSingleSelect = vi.fn(() =>
    Promise.resolve({ data: executionRow, error: null }),
  )
  const eqTenantFilter = vi.fn(() => ({ maybeSingle: maybeSingleSelect }))
  const eqIdFilter = vi.fn(() => ({ eq: eqTenantFilter }))
  const selectFrom = vi.fn(() => ({ eq: eqIdFilter }))

  // Optimistic lock UPDATE chain
  const maybeSingleUpdate = vi.fn(() =>
    Promise.resolve({
      data: lockSuccess && executionRow ? { id: executionRow.id } : null,
      error: lockError,
    }),
  )
  const selectAfterUpdate = vi.fn(() => ({ maybeSingle: maybeSingleUpdate }))
  const inFilter = vi.fn(() => ({ select: selectAfterUpdate }))
  const eqIdUpdate = vi.fn(() => ({ in: inFilter }))
  const updateFn = vi.fn(() => ({ eq: eqIdUpdate }))

  // Rollback UPDATE (no return value needed)
  const rollbackEq = vi.fn(() => Promise.resolve({ data: null, error: null }))
  const rollbackUpdate = vi.fn(() => ({ eq: rollbackEq }))

  let callCount = 0
  const from = vi.fn(() => {
    callCount++
    if (callCount === 1) return { select: selectFrom }
    if (callCount === 2) return { update: updateFn }
    return { update: rollbackUpdate }
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { from } as any
}

function makeRequest(body: unknown) {
  return new Request('https://cms.example.com/api/workflows/retry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/workflows/retry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('N8N_WORKFLOW_ORCHESTRATOR_URL', 'https://n8n.example.com/webhook/orchestrator')
  })

  // ─── Auth failures ───────────────────────────────────────────────────────

  it('returns 403 when user is not authenticated', async () => {
    vi.mocked(requireAuthContextFull).mockReturnValue(errAsync('Not authenticated'))

    const request = makeRequest({ execution_id: EXECUTION_ID })
    const response = await handleRetryPost(request)

    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body.error).toBe('forbidden')
  })

  it('returns 403 when authenticated but missing workflows.execute permission', async () => {
    const authWithoutPermission = makeAuthFull({ permissions: ['surveys'] })
    vi.mocked(requireAuthContextFull).mockReturnValue(okAsync(authWithoutPermission))
    // hasPermission returns false → no workflows.execute
    vi.mocked(hasPermission).mockReturnValue(false)

    const request = makeRequest({ execution_id: EXECUTION_ID })
    const response = await handleRetryPost(request)

    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body.error).toBe('forbidden')
  })

  // ─── Not found ───────────────────────────────────────────────────────────

  it('returns 404 when execution not found for authenticated tenant', async () => {
    vi.mocked(requireAuthContextFull).mockReturnValue(okAsync(makeAuthFull()))
    vi.mocked(hasPermission).mockReturnValue(true)

    const serviceClient = createMockServiceClient({ executionRow: null })
    vi.mocked(createServiceClient).mockReturnValue(serviceClient)

    const request = makeRequest({ execution_id: EXECUTION_ID })
    const response = await handleRetryPost(request)

    expect(response.status).toBe(404)
    const body = await response.json()
    expect(body.error).toBe('execution_not_found_or_invalid_state')
  })

  it('returns 404 when execution belongs to a different tenant (cross-tenant rejection)', async () => {
    // User is authenticated as 'tenant-MINE', execution belongs to 'tenant-OTHER'.
    // Because our SELECT uses .eq('tenant_id', tenantId), the RLS-equivalent
    // filter ensures the row is never returned — same 404 as "not found".
    vi.mocked(requireAuthContextFull).mockReturnValue(
      okAsync(makeAuthFull({ tenantId: 'tenant-MINE' })),
    )
    vi.mocked(hasPermission).mockReturnValue(true)

    // No execution row returned (filtered out by tenant_id mismatch)
    const serviceClient = createMockServiceClient({ executionRow: null })
    vi.mocked(createServiceClient).mockReturnValue(serviceClient)

    const request = makeRequest({ execution_id: EXECUTION_ID })
    const response = await handleRetryPost(request)

    expect(response.status).toBe(404)
    const body = await response.json()
    expect(body.error).toBe('execution_not_found_or_invalid_state')
  })

  // ─── Conflict ────────────────────────────────────────────────────────────

  it('returns 409 when execution is already running or completed (optimistic lock fails)', async () => {
    vi.mocked(requireAuthContextFull).mockReturnValue(okAsync(makeAuthFull()))
    vi.mocked(hasPermission).mockReturnValue(true)

    const executionRow = {
      id: EXECUTION_ID,
      workflow_id: WORKFLOW_ID,
      tenant_id: TENANT_ID,
      trigger_payload: { trigger_type: 'manual' },
      status: 'running',
    }
    // lockSuccess: false — execution status is 'running', not in ('failed','cancelled')
    const serviceClient = createMockServiceClient({ executionRow, lockSuccess: false })
    vi.mocked(createServiceClient).mockReturnValue(serviceClient)

    const request = makeRequest({ execution_id: EXECUTION_ID })
    const response = await handleRetryPost(request)

    expect(response.status).toBe(409)
    const body = await response.json()
    expect(body.error).toBe('already_running_or_invalid_state')
  })

  // ─── Success ─────────────────────────────────────────────────────────────

  it('returns 200 with executionId on successful retry dispatch', async () => {
    vi.mocked(requireAuthContextFull).mockReturnValue(okAsync(makeAuthFull()))
    vi.mocked(hasPermission).mockReturnValue(true)

    const executionRow = {
      id: EXECUTION_ID,
      workflow_id: WORKFLOW_ID,
      tenant_id: TENANT_ID,
      trigger_payload: { trigger_type: 'manual' },
      status: 'failed',
    }
    const serviceClient = createMockServiceClient({ executionRow, lockSuccess: true })
    vi.mocked(createServiceClient).mockReturnValue(serviceClient)

    vi.mocked(dispatchToN8n).mockReturnValue({
      match: (onOk: (v: { executionId: string }) => unknown) => onOk({ executionId: EXECUTION_ID }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    const request = makeRequest({ execution_id: EXECUTION_ID })
    const response = await handleRetryPost(request)

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.success).toBe(true)
    expect(body.executionId).toBe(EXECUTION_ID)
  })

  // ─── Dispatch failure ────────────────────────────────────────────────────

  it('reverses optimistic lock and returns 502 when n8n dispatch fails', async () => {
    vi.mocked(requireAuthContextFull).mockReturnValue(okAsync(makeAuthFull()))
    vi.mocked(hasPermission).mockReturnValue(true)

    const executionRow = {
      id: EXECUTION_ID,
      workflow_id: WORKFLOW_ID,
      tenant_id: TENANT_ID,
      trigger_payload: { trigger_type: 'survey_submitted', responseId: 'resp-123' },
      status: 'failed',
    }
    const serviceClient = createMockServiceClient({ executionRow, lockSuccess: true })
    vi.mocked(createServiceClient).mockReturnValue(serviceClient)

    vi.mocked(dispatchToN8n).mockReturnValue({
      match: (_onOk: unknown, onErr: (e: string) => unknown) => onErr('n8n connection refused'),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    const request = makeRequest({ execution_id: EXECUTION_ID })
    const response = await handleRetryPost(request)

    expect(response.status).toBe(502)
    const body = await response.json()
    expect(body.success).toBe(false)
    expect(body.error).toBe('n8n connection refused')

    // Verify rollback was attempted (3rd from() call = rollback UPDATE)
    expect(serviceClient.from).toHaveBeenCalledTimes(3)
  })
})
