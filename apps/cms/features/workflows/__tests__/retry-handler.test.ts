/**
 * Tests for retryWorkflowExecutionHandler in handlers.server.ts.
 *
 * Targets the pure handler so we don't drive the createServerFn RPC pipeline.
 * Same auth/lock/dispatch surface as the previous /api/workflows/retry route,
 * now expressed as a discriminated-union return shape consumed by the UI.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { okAsync, errAsync } from 'neverthrow'

vi.mock('@/lib/server-auth', () => ({
  requireAuthContextFull: vi.fn(),
  hasPermission: vi.fn(),
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(),
}))

import { requireAuthContextFull, hasPermission } from '@/lib/server-auth'
import { createServiceClient } from '@/lib/supabase/service'
import { retryWorkflowExecutionHandler } from '../handlers.server'

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
 * Service client mock with sequential .from() responses:
 *   1 → SELECT (returns executionRow or null)
 *   2 → UPDATE optimistic lock (locked row when lockSuccess=true)
 *   3 → UPDATE rollback (no-op)
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

  // Rollback UPDATE
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('retryWorkflowExecutionHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('N8N_WORKFLOW_ORCHESTRATOR_URL', 'https://n8n.example.com/webhook/orchestrator')
    vi.stubEnv('ORCHESTRATOR_WEBHOOK_SECRET', 'test-secret')
  })

  // ─── Auth ──────────────────────────────────────────────────────────────────

  it('returns forbidden when user is not authenticated', async () => {
    vi.mocked(requireAuthContextFull).mockReturnValue(errAsync('Not authenticated'))

    const result = await retryWorkflowExecutionHandler({ executionId: EXECUTION_ID })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('forbidden')
  })

  it('returns forbidden when missing workflows.execute permission', async () => {
    vi.mocked(requireAuthContextFull).mockReturnValue(
      okAsync(makeAuthFull({ permissions: ['surveys'] })),
    )
    vi.mocked(hasPermission).mockReturnValue(false)

    const result = await retryWorkflowExecutionHandler({ executionId: EXECUTION_ID })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('forbidden')
  })

  // ─── Not found ─────────────────────────────────────────────────────────────

  it('returns not_found when execution does not exist for tenant', async () => {
    vi.mocked(requireAuthContextFull).mockReturnValue(okAsync(makeAuthFull()))
    vi.mocked(hasPermission).mockReturnValue(true)

    vi.mocked(createServiceClient).mockReturnValue(
      createMockServiceClient({ executionRow: null }),
    )

    const result = await retryWorkflowExecutionHandler({ executionId: EXECUTION_ID })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('not_found')
  })

  it('returns not_found for cross-tenant execution (silent, no existence leak)', async () => {
    vi.mocked(requireAuthContextFull).mockReturnValue(
      okAsync(makeAuthFull({ tenantId: 'tenant-MINE' })),
    )
    vi.mocked(hasPermission).mockReturnValue(true)

    // .eq('tenant_id', tenantId) filters out other tenants — same path as not_found
    vi.mocked(createServiceClient).mockReturnValue(
      createMockServiceClient({ executionRow: null }),
    )

    const result = await retryWorkflowExecutionHandler({ executionId: EXECUTION_ID })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('not_found')
  })

  // ─── Conflict ──────────────────────────────────────────────────────────────

  it('returns conflict when optimistic lock fails (already running)', async () => {
    vi.mocked(requireAuthContextFull).mockReturnValue(okAsync(makeAuthFull()))
    vi.mocked(hasPermission).mockReturnValue(true)

    const executionRow = {
      id: EXECUTION_ID,
      workflow_id: WORKFLOW_ID,
      tenant_id: TENANT_ID,
      trigger_payload: { trigger_type: 'manual' },
      status: 'running',
    }
    vi.mocked(createServiceClient).mockReturnValue(
      createMockServiceClient({ executionRow, lockSuccess: false }),
    )

    const result = await retryWorkflowExecutionHandler({ executionId: EXECUTION_ID })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('conflict')
  })

  // ─── Orchestrator misconfigured ────────────────────────────────────────────

  it('returns orchestrator_not_configured when env var is missing', async () => {
    vi.mocked(requireAuthContextFull).mockReturnValue(okAsync(makeAuthFull()))
    vi.mocked(hasPermission).mockReturnValue(true)

    const executionRow = {
      id: EXECUTION_ID,
      workflow_id: WORKFLOW_ID,
      tenant_id: TENANT_ID,
      trigger_payload: { trigger_type: 'manual' },
      status: 'failed',
    }
    vi.mocked(createServiceClient).mockReturnValue(
      createMockServiceClient({ executionRow, lockSuccess: true }),
    )

    vi.stubEnv('N8N_WORKFLOW_ORCHESTRATOR_URL', '')

    const result = await retryWorkflowExecutionHandler({ executionId: EXECUTION_ID })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('orchestrator_not_configured')
  })

  // ─── Success ───────────────────────────────────────────────────────────────

  it('returns ok with executionId on successful retry dispatch', async () => {
    vi.mocked(requireAuthContextFull).mockReturnValue(okAsync(makeAuthFull()))
    vi.mocked(hasPermission).mockReturnValue(true)

    const executionRow = {
      id: EXECUTION_ID,
      workflow_id: WORKFLOW_ID,
      tenant_id: TENANT_ID,
      trigger_payload: { trigger_type: 'manual' },
      status: 'failed',
    }
    vi.mocked(createServiceClient).mockReturnValue(
      createMockServiceClient({ executionRow, lockSuccess: true }),
    )

    // Mock fetch (used by dispatchToN8nHandler)
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ executionId: 'new-exec-id' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await retryWorkflowExecutionHandler({ executionId: EXECUTION_ID })

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.executionId).toBe('new-exec-id')
    expect(fetchMock).toHaveBeenCalled()
  })

  // ─── Dispatch failure ──────────────────────────────────────────────────────

  it('returns dispatch_failed and reverses optimistic lock on n8n failure', async () => {
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

    const fetchMock = vi.fn(() =>
      Promise.resolve(new Response('Bad Gateway', { status: 502 })),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await retryWorkflowExecutionHandler({ executionId: EXECUTION_ID })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('dispatch_failed')

    // Verify rollback was attempted (3rd from() call)
    expect(serviceClient.from).toHaveBeenCalledTimes(3)
  })
})
