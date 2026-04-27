import { describe, it, expect, vi } from 'vitest'
import { fetchWorkflowForPublicTrigger } from '../server'

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

interface WorkflowRow {
  id: string
  tenant_id: string
  trigger_type: string
  is_active: boolean
}

function createMockSupabase(row: WorkflowRow | null) {
  const maybeSingle = vi.fn(() =>
    Promise.resolve({ data: row, error: null }),
  )
  const eq = vi.fn(() => ({ maybeSingle }))
  const select = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ select }))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { from } as any
}

const WORKFLOW_ID = 'wf-1'
const TENANT_A = 'tenant-a'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('fetchWorkflowForPublicTrigger', () => {
  it('returns ok with workflow tenantId when workflow exists, is active, and trigger types match', async () => {
    const supabase = createMockSupabase({
      id: WORKFLOW_ID,
      tenant_id: TENANT_A,
      trigger_type: 'survey_submitted',
      is_active: true,
    })

    const result = await fetchWorkflowForPublicTrigger(
      supabase,
      WORKFLOW_ID,
      'survey_submitted',
    )

    expect(result.isOk()).toBe(true)
    expect(result._unsafeUnwrap()).toEqual({ tenantId: TENANT_A })
  })

  it('errors with workflow_not_found when row is null', async () => {
    const supabase = createMockSupabase(null)

    const result = await fetchWorkflowForPublicTrigger(
      supabase,
      WORKFLOW_ID,
      'survey_submitted',
    )

    expect(result.isErr()).toBe(true)
    expect(result._unsafeUnwrapErr()).toBe('workflow_not_found')
  })

  it('errors with workflow_not_active when is_active=false', async () => {
    const supabase = createMockSupabase({
      id: WORKFLOW_ID,
      tenant_id: TENANT_A,
      trigger_type: 'survey_submitted',
      is_active: false,
    })

    const result = await fetchWorkflowForPublicTrigger(
      supabase,
      WORKFLOW_ID,
      'survey_submitted',
    )

    expect(result.isErr()).toBe(true)
    expect(result._unsafeUnwrapErr()).toBe('workflow_not_active')
  })

  it('errors with trigger_type_mismatch when types differ', async () => {
    const supabase = createMockSupabase({
      id: WORKFLOW_ID,
      tenant_id: TENANT_A,
      trigger_type: 'manual',
      is_active: true,
    })

    const result = await fetchWorkflowForPublicTrigger(
      supabase,
      WORKFLOW_ID,
      'survey_submitted',
    )

    expect(result.isErr()).toBe(true)
    expect(result._unsafeUnwrapErr()).toBe('trigger_type_mismatch')
  })
})
