import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Mocks ---

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(),
}))

vi.mock('@/features/workflows/engine/executor', () => ({
  executeWorkflow: vi.fn().mockResolvedValue(undefined),
  processWorkflowTrigger: vi.fn().mockResolvedValue(undefined),
  resumeExecution: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/features/workflows/engine/types', () => ({
  isTriggerType: vi.fn((v: string) =>
    ['survey_submitted', 'booking_created', 'lead_scored', 'manual', 'scheduled'].includes(v)
  ),
}))

import { createServiceClient } from '@/lib/supabase/service'
import {
  executeWorkflow,
  processWorkflowTrigger,
  resumeExecution,
} from '@/features/workflows/engine/executor'

// Import route handlers
import { POST as triggerPOST } from '../trigger/route'
import { POST as callbackPOST } from '../callback/route'
import { POST as processDueDelaysPOST } from '../process-due-delays/route'
import { POST as resumePOST } from '../resume/route'

// --- Helpers ---

function createRequest(
  body: unknown,
  authToken?: string,
  url = 'http://localhost/api/workflows/trigger'
): Request {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  if (authToken) headers.set('Authorization', `Bearer ${authToken}`)
  return new Request(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

function createInvalidJsonRequest(authToken?: string): Request {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  if (authToken) headers.set('Authorization', `Bearer ${authToken}`)
  return new Request('http://localhost/api/workflows/trigger', {
    method: 'POST',
    headers,
    body: 'not valid json{{{',
  })
}

import { mockChain } from '@/__tests__/utils/supabase-mocks'

/**
 * Creates a Supabase service client mock that returns different chains
 * for sequential .from() calls. Each call to .from() returns the next chain.
 */
function mockServiceClient(...chains: ReturnType<typeof mockChain>[]) {
  let callIndex = 0
  const client = {
    from: vi.fn(() => {
      const chain = chains[callIndex] ?? chains[chains.length - 1]
      callIndex++
      return chain
    }),
    rpc: vi.fn(),
  }
  return client
}

const SECRET = 'test-secret'

// --- Test suites ---

describe('POST /api/workflows/trigger', () => {
  beforeEach(() => {
    vi.stubEnv('WORKFLOW_TRIGGER_SECRET', SECRET)
    // Re-set after resetAllMocks clears mockResolvedValue from vi.mock()
    vi.mocked(executeWorkflow).mockResolvedValue(undefined as any)
    vi.mocked(processWorkflowTrigger).mockResolvedValue(undefined as any)
  })

  it('returns 500 when WORKFLOW_TRIGGER_SECRET is not configured', async () => {
    vi.stubEnv('WORKFLOW_TRIGGER_SECRET', '')
    delete process.env.WORKFLOW_TRIGGER_SECRET

    const req = createRequest(
      { trigger_type: 'manual', tenant_id: 't1', payload: {} },
      SECRET
    )
    const res = await triggerPOST(req)
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toMatch(/misconfigured/i)
  })

  it('returns 401 when auth header is missing', async () => {
    const req = createRequest({
      trigger_type: 'manual',
      tenant_id: 't1',
      payload: {},
    })
    const res = await triggerPOST(req)
    expect(res.status).toBe(401)
  })

  it('returns 401 when Bearer token is invalid', async () => {
    const req = createRequest(
      { trigger_type: 'manual', tenant_id: 't1', payload: {} },
      'wrong-token'
    )
    const res = await triggerPOST(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 for invalid JSON body', async () => {
    const req = createInvalidJsonRequest(SECRET)
    const res = await triggerPOST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/invalid json/i)
  })

  it('returns 400 when required fields are missing', async () => {
    const req = createRequest({ tenant_id: 't1', payload: {} }, SECRET)
    const res = await triggerPOST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/missing required/i)
  })

  it('returns 400 for invalid trigger_type', async () => {
    const req = createRequest(
      { trigger_type: 'invalid_type', tenant_id: 't1', payload: {} },
      SECRET
    )
    const res = await triggerPOST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/invalid trigger_type/i)
  })

  it('returns 202 and calls processWorkflowTrigger when no workflow_id', async () => {
    const req = createRequest(
      {
        trigger_type: 'survey_submitted',
        tenant_id: 't1',
        payload: { responseId: 'r1' },
      },
      SECRET
    )
    const res = await triggerPOST(req)
    expect(res.status).toBe(202)
    const json = await res.json()
    expect(json.triggered).toBe(true)
    expect(processWorkflowTrigger).toHaveBeenCalledWith(
      'survey_submitted',
      't1',
      expect.objectContaining({ trigger_type: 'survey_submitted', responseId: 'r1' })
    )
    expect(executeWorkflow).not.toHaveBeenCalled()
  })

  it('returns 202 and calls executeWorkflow when workflow_id provided and active', async () => {
    const chain = mockChain({ data: { id: 'wf1', is_active: true }, error: null })
    const client = mockServiceClient(chain)
    vi.mocked(createServiceClient).mockReturnValue(client as never)

    const req = createRequest(
      {
        trigger_type: 'manual',
        tenant_id: 't1',
        payload: {},
        workflow_id: 'wf1',
      },
      SECRET
    )
    const res = await triggerPOST(req)
    expect(res.status).toBe(202)
    expect(executeWorkflow).toHaveBeenCalledWith(
      'wf1',
      expect.objectContaining({ trigger_type: 'manual' })
    )
  })

  it('returns 404 when workflow_id not found', async () => {
    const chain = mockChain({ data: null, error: null })
    const client = mockServiceClient(chain)
    vi.mocked(createServiceClient).mockReturnValue(client as never)

    const req = createRequest(
      {
        trigger_type: 'manual',
        tenant_id: 't1',
        payload: {},
        workflow_id: 'nonexistent',
      },
      SECRET
    )
    const res = await triggerPOST(req)
    expect(res.status).toBe(404)
  })

  it('returns 422 when workflow_id is inactive', async () => {
    const chain = mockChain({ data: { id: 'wf1', is_active: false }, error: null })
    const client = mockServiceClient(chain)
    vi.mocked(createServiceClient).mockReturnValue(client as never)

    const req = createRequest(
      {
        trigger_type: 'manual',
        tenant_id: 't1',
        payload: {},
        workflow_id: 'wf1',
      },
      SECRET
    )
    const res = await triggerPOST(req)
    expect(res.status).toBe(422)
  })
})

describe('POST /api/workflows/callback', () => {
  beforeEach(() => {
    vi.stubEnv('WORKFLOW_TRIGGER_SECRET', SECRET)
    vi.mocked(resumeExecution).mockResolvedValue(undefined as any)
  })

  it('returns 500 when WORKFLOW_TRIGGER_SECRET is not configured', async () => {
    vi.stubEnv('WORKFLOW_TRIGGER_SECRET', '')
    delete process.env.WORKFLOW_TRIGGER_SECRET

    const req = createRequest(
      { step_execution_id: 'se1', status: 'completed' },
      SECRET
    )
    const res = await callbackPOST(req)
    expect(res.status).toBe(500)
  })

  it('returns 401 with invalid auth', async () => {
    const req = createRequest(
      { step_execution_id: 'se1', status: 'completed' },
      'wrong'
    )
    const res = await callbackPOST(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 when required fields are missing', async () => {
    const req = createRequest({ step_execution_id: 'se1' }, SECRET)
    const res = await callbackPOST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when status is invalid', async () => {
    const req = createRequest(
      { step_execution_id: 'se1', status: 'unknown' },
      SECRET
    )
    const res = await callbackPOST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/must be "completed" or "failed"/)
  })

  it('returns 404 when step execution not found', async () => {
    const fetchChain = mockChain({ data: null, error: null })
    const client = mockServiceClient(fetchChain)
    vi.mocked(createServiceClient).mockReturnValue(client as never)

    const req = createRequest(
      { step_execution_id: 'nonexistent', status: 'completed' },
      SECRET
    )
    const res = await callbackPOST(req)
    expect(res.status).toBe(404)
  })

  it('returns 200 idempotent when step already processed', async () => {
    const fetchChain = mockChain({
      data: { id: 'se1', execution_id: 'ex1', step_id: 's1', status: 'completed' },
      error: null,
    })
    const client = mockServiceClient(fetchChain)
    vi.mocked(createServiceClient).mockReturnValue(client as never)

    const req = createRequest(
      { step_execution_id: 'se1', status: 'completed' },
      SECRET
    )
    const res = await callbackPOST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.message).toMatch(/already processed/)
    expect(resumeExecution).not.toHaveBeenCalled()
  })

  it('returns 200 and resumes execution on valid callback', async () => {
    const fetchChain = mockChain({
      data: { id: 'se1', execution_id: 'ex1', step_id: 's1', status: 'running' },
      error: null,
    })
    const updateChain = mockChain({ data: null, error: null })
    const client = mockServiceClient(fetchChain, updateChain)
    vi.mocked(createServiceClient).mockReturnValue(client as never)

    const req = createRequest(
      {
        step_execution_id: 'se1',
        status: 'completed',
        output_payload: { result: 'ok' },
      },
      SECRET
    )
    const res = await callbackPOST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)

    // resumeExecution is fire-and-forget — give it a tick
    await vi.waitFor(() => {
      expect(resumeExecution).toHaveBeenCalledWith('ex1', 'se1', 'completed')
    })
  })

  it('returns 500 when Supabase fetch fails', async () => {
    const fetchChain = mockChain({
      data: null,
      error: { message: 'DB connection failed' },
    })
    const client = mockServiceClient(fetchChain)
    vi.mocked(createServiceClient).mockReturnValue(client as never)

    const req = createRequest(
      { step_execution_id: 'se1', status: 'completed' },
      SECRET
    )
    const res = await callbackPOST(req)
    expect(res.status).toBe(500)
  })

  it('returns 500 when step update fails', async () => {
    const fetchChain = mockChain({
      data: { id: 'se1', execution_id: 'ex1', step_id: 's1', status: 'running' },
      error: null,
    })
    const updateChain = mockChain({ data: null, error: { message: 'update failed' } })
    const client = mockServiceClient(fetchChain, updateChain)
    vi.mocked(createServiceClient).mockReturnValue(client as never)

    const req = createRequest(
      { step_execution_id: 'se1', status: 'completed' },
      SECRET
    )
    const res = await callbackPOST(req)
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toMatch(/failed to update/i)
  })
})

describe('POST /api/workflows/process-due-delays', () => {
  beforeEach(() => {
    vi.stubEnv('WORKFLOW_TRIGGER_SECRET', SECRET)
    vi.mocked(resumeExecution).mockResolvedValue(undefined as any)
  })

  it('returns 401 with invalid auth', async () => {
    const req = createRequest({}, 'wrong')
    const res = await processDueDelaysPOST(req)
    expect(res.status).toBe(401)
  })

  it('returns 200 with processed: 0 when no due steps', async () => {
    const rpcChain = mockChain({ data: [], error: null })
    const client = { from: vi.fn(), rpc: rpcChain.rpc }
    // process-due-delays calls serviceClient.rpc() directly
    vi.mocked(createServiceClient).mockReturnValue(client as never)

    const req = createRequest({}, SECRET)
    const res = await processDueDelaysPOST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.processed).toBe(0)
    expect(json.step_ids).toEqual([])
  })

  it('claims and processes due steps, returns processed count', async () => {
    const claimedSteps = [
      { id: 'step1', execution_id: 'ex1' },
      { id: 'step2', execution_id: 'ex2' },
    ]

    // Sequential: rpc → from(step1 update) → from(exec1 update) → from(step2 update) → from(exec2 update)
    const stepUpdateChain = mockChain({ data: null, error: null })
    const execUpdateChain = mockChain({ data: null, error: null })

    const client = {
      rpc: vi.fn().mockResolvedValue({ data: claimedSteps, error: null }),
      from: vi.fn().mockReturnValue(stepUpdateChain),
    }
    // Override: alternate step update and exec update chains
    let fromCallIndex = 0
    client.from = vi.fn(() => {
      fromCallIndex++
      // Even calls (1,3) = step update, Odd calls (2,4) = exec update
      if (fromCallIndex % 2 === 0) return execUpdateChain as never
      return stepUpdateChain as never
    })

    vi.mocked(createServiceClient).mockReturnValue(client as never)

    const req = createRequest({}, SECRET)
    const res = await processDueDelaysPOST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.processed).toBe(2)
    expect(json.step_ids).toEqual(['step1', 'step2'])
    // process-due-delays awaits resumeExecution sequentially for each step
    expect(resumeExecution).toHaveBeenCalledWith('ex1', 'step1', 'completed')
    expect(resumeExecution).toHaveBeenCalledWith('ex2', 'step2', 'completed')
  })

  it('returns 500 when RPC claim fails', async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({ data: null, error: { message: 'RPC failed' } }),
      from: vi.fn(),
    }
    vi.mocked(createServiceClient).mockReturnValue(client as never)

    const req = createRequest({}, SECRET)
    const res = await processDueDelaysPOST(req)
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toMatch(/failed to query/i)
  })

  it('continues processing when individual step update fails', async () => {
    const claimedSteps = [
      { id: 'step1', execution_id: 'ex1' },
      { id: 'step2', execution_id: 'ex2' },
    ]

    // step1 update fails, step2 succeeds
    const failChain = mockChain({ data: null, error: { message: 'update error' } })
    const successChain = mockChain({ data: null, error: null })

    let fromCallIndex = 0
    const client = {
      rpc: vi.fn().mockResolvedValue({ data: claimedSteps, error: null }),
      from: vi.fn(() => {
        fromCallIndex++
        // Call 1 = step1 update (fail), Call 2 would be exec1 update (skipped by continue)
        // Call 2 = step2 update (success), Call 3 = exec2 update (success)
        if (fromCallIndex === 1) return failChain as never
        return successChain as never
      }),
    }
    vi.mocked(createServiceClient).mockReturnValue(client as never)

    const req = createRequest({}, SECRET)
    const res = await processDueDelaysPOST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    // step1 failed (continue), step2 succeeded
    expect(json.processed).toBe(1)
    expect(json.step_ids).toEqual(['step2'])
  })
})

describe('POST /api/workflows/resume', () => {
  beforeEach(async () => {
    // Flush microtask queue to resolve any fire-and-forget promises from prior tests
    await new Promise((r) => setTimeout(r, 0))
    vi.mocked(resumeExecution).mockResolvedValue(undefined as any)
    vi.stubEnv('WORKFLOW_TRIGGER_SECRET', SECRET)
  })

  it('returns 500 when WORKFLOW_TRIGGER_SECRET is not configured', async () => {
    vi.stubEnv('WORKFLOW_TRIGGER_SECRET', '')
    delete process.env.WORKFLOW_TRIGGER_SECRET

    const req = createRequest({ step_execution_id: 'se1' }, SECRET)
    const res = await resumePOST(req)
    expect(res.status).toBe(500)
  })

  it('returns 401 with invalid auth', async () => {
    const req = createRequest({ step_execution_id: 'se1' }, 'wrong')
    const res = await resumePOST(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 when step_execution_id is missing', async () => {
    const req = createRequest({}, SECRET)
    const res = await resumePOST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/step_execution_id/)
  })

  it('returns 404 when step execution not found', async () => {
    const fetchChain = mockChain({ data: null, error: null })
    const client = mockServiceClient(fetchChain)
    vi.mocked(createServiceClient).mockReturnValue(client as never)

    const req = createRequest({ step_execution_id: 'nonexistent' }, SECRET)
    const res = await resumePOST(req)
    expect(res.status).toBe(404)
  })

  it('returns 200 idempotent when step already processed', async () => {
    const fetchChain = mockChain({
      data: { id: 'se1', execution_id: 'ex1', step_id: 's1', status: 'completed' },
      error: null,
    })
    const client = mockServiceClient(fetchChain)
    vi.mocked(createServiceClient).mockReturnValue(client as never)

    const req = createRequest({ step_execution_id: 'se1' }, SECRET)
    const res = await resumePOST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.message).toMatch(/already processed/)
    expect(resumeExecution).not.toHaveBeenCalled()
  })

  it('returns 200 and resumes execution on valid request', async () => {
    const fetchChain = mockChain({
      data: { id: 'se1', execution_id: 'ex1', step_id: 's1', status: 'waiting' },
      error: null,
    })
    const stepUpdateChain = mockChain({ data: null, error: null })
    const execUpdateChain = mockChain({ data: null, error: null })
    const client = mockServiceClient(fetchChain, stepUpdateChain, execUpdateChain)
    vi.mocked(createServiceClient).mockReturnValue(client as never)

    const req = createRequest({ step_execution_id: 'se1' }, SECRET)
    const res = await resumePOST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)

    await vi.waitFor(() => {
      expect(resumeExecution).toHaveBeenCalledWith('ex1', 'se1', 'completed')
    })
  })

  it('returns 500 when Supabase fetch fails', async () => {
    const fetchChain = mockChain({
      data: null,
      error: { message: 'connection error' },
    })
    const client = mockServiceClient(fetchChain)
    vi.mocked(createServiceClient).mockReturnValue(client as never)

    const req = createRequest({ step_execution_id: 'se1' }, SECRET)
    const res = await resumePOST(req)
    expect(res.status).toBe(500)
  })

  it('returns 500 when step update fails', async () => {
    const fetchChain = mockChain({
      data: { id: 'se1', execution_id: 'ex1', step_id: 's1', status: 'waiting' },
      error: null,
    })
    const stepUpdateChain = mockChain({
      data: null,
      error: { message: 'update failed' },
    })
    const client = mockServiceClient(fetchChain, stepUpdateChain)
    vi.mocked(createServiceClient).mockReturnValue(client as never)

    const req = createRequest({ step_execution_id: 'se1' }, SECRET)
    const res = await resumePOST(req)
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toMatch(/failed to update/i)
  })
})
