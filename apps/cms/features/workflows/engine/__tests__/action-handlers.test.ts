import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock types to avoid messages.ts import chain
vi.mock('../../types', () => ({}))

// DO NOT mock ./utils — resolveVariables is pure, test real integration

import { stepHandlers, isAsyncStepType } from '../action-handlers'
import type { VariableContext } from '../types'
import {
  makeStep as makeStepFixture,
  makeContext,
} from '../../__tests__/fixtures'

// --- Local wrapper: action-handlers uses (stepType, config) signature ---

function makeStep(stepType: string, config: Record<string, unknown>) {
  return makeStepFixture('step-1', stepType, config)
}

function makeServiceClient(updateResult: { error: null | { message: string } } = { error: null }) {
  return {
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve(updateResult)),
      })),
    })),
  } as any
}

// --- Tests ---

describe('isAsyncStepType', () => {
  it('returns true for send_email', () => {
    expect(isAsyncStepType('send_email')).toBe(true)
  })

  it('returns true for ai_action', () => {
    expect(isAsyncStepType('ai_action')).toBe(true)
  })

  it('returns false for delay', () => {
    expect(isAsyncStepType('delay')).toBe(false)
  })

  it('returns false for webhook', () => {
    expect(isAsyncStepType('webhook')).toBe(false)
  })

  it('returns false for condition', () => {
    expect(isAsyncStepType('condition')).toBe(false)
  })

  it('returns false for unknown step type', () => {
    expect(isAsyncStepType('unknown_type')).toBe(false)
  })
})

describe('stepHandlers registry', () => {
  it('has entries for send_email, ai_action, delay, webhook', () => {
    expect(stepHandlers).toHaveProperty('send_email')
    expect(stepHandlers).toHaveProperty('ai_action')
    expect(stepHandlers).toHaveProperty('delay')
    expect(stepHandlers).toHaveProperty('webhook')
  })

  it('all entries are functions', () => {
    expect(typeof stepHandlers.send_email).toBe('function')
    expect(typeof stepHandlers.ai_action).toBe('function')
    expect(typeof stepHandlers.delay).toBe('function')
    expect(typeof stepHandlers.webhook).toBe('function')
  })
})

describe('handleDelay (stepHandlers.delay)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-07T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
  })

  it('computes correct resume_at for minutes (value=30, unit=minutes)', async () => {
    const serviceClient = makeServiceClient()
    const step = makeStep('delay', { value: 30, unit: 'minutes' })
    const context = makeContext()

    const result = await stepHandlers.delay(step, context, serviceClient, {})

    expect(result.success).toBe(true)
    expect(result.async).toBe(true)

    const updateCall = serviceClient.from.mock.results[0].value.update
    const updateArg = updateCall.mock.calls[0][0]
    expect(updateArg.resume_at).toBe('2026-04-07T12:30:00.000Z')
    expect(updateArg.status).toBe('waiting')
  })

  it('computes correct resume_at for hours (value=2, unit=hours)', async () => {
    const serviceClient = makeServiceClient()
    const step = makeStep('delay', { value: 2, unit: 'hours' })

    const result = await stepHandlers.delay(step, makeContext(), serviceClient, {})

    expect(result.success).toBe(true)
    const updateArg = serviceClient.from.mock.results[0].value.update.mock.calls[0][0]
    expect(updateArg.resume_at).toBe('2026-04-07T14:00:00.000Z')
  })

  it('computes correct resume_at for days (value=1, unit=days)', async () => {
    const serviceClient = makeServiceClient()
    const step = makeStep('delay', { value: 1, unit: 'days' })

    const result = await stepHandlers.delay(step, makeContext(), serviceClient, {})

    expect(result.success).toBe(true)
    const updateArg = serviceClient.from.mock.results[0].value.update.mock.calls[0][0]
    expect(updateArg.resume_at).toBe('2026-04-08T12:00:00.000Z')
  })

  it('writes status=waiting and resume_at to DB via serviceClient', async () => {
    const serviceClient = makeServiceClient()
    const step = makeStep('delay', { value: 10, unit: 'minutes' })
    const context = makeContext({ stepExecutionId: 'step-exec-42' })

    await stepHandlers.delay(step, context, serviceClient, {})

    expect(serviceClient.from).toHaveBeenCalledWith('workflow_step_executions')
    const chainedUpdate = serviceClient.from.mock.results[0].value.update
    expect(chainedUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'waiting', resume_at: expect.any(String) })
    )
    const chainedEq = chainedUpdate.mock.results[0].value.eq
    expect(chainedEq).toHaveBeenCalledWith('id', 'step-exec-42')
  })

  it('returns { success: true, async: true } on success', async () => {
    const step = makeStep('delay', { value: 5, unit: 'minutes' })
    const result = await stepHandlers.delay(step, makeContext(), makeServiceClient(), {})

    expect(result).toEqual({ success: true, async: true })
  })

  it('returns error when step_config.type !== delay', async () => {
    const step = makeStep('webhook', { value: 5, unit: 'minutes' })
    const result = await stepHandlers.delay(step, makeContext(), makeServiceClient(), {})

    expect(result.success).toBe(false)
    expect(result.error).toContain('type mismatch')
  })

  it('returns error when value is missing', async () => {
    const step = makeStep('delay', { unit: 'minutes' })
    const result = await stepHandlers.delay(step, makeContext(), makeServiceClient(), {})

    expect(result.success).toBe(false)
    expect(result.error).toContain('missing value or unit')
  })

  it('returns error when unit is missing', async () => {
    const step = makeStep('delay', { value: 5 })
    const result = await stepHandlers.delay(step, makeContext(), makeServiceClient(), {})

    expect(result.success).toBe(false)
    expect(result.error).toContain('missing value or unit')
  })

  it('returns error when Supabase update fails', async () => {
    const serviceClient = makeServiceClient({ error: { message: 'DB connection lost' } })
    const step = makeStep('delay', { value: 5, unit: 'minutes' })

    const result = await stepHandlers.delay(step, makeContext(), serviceClient, {})

    expect(result.success).toBe(false)
    expect(result.error).toContain('DB connection lost')
  })
})

describe('handleWebhook (stepHandlers.webhook)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('successful POST: resolves URL, calls fetch, returns success + statusCode + responseBody', async () => {
    const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve('OK'),
    })

    const step = makeStep('webhook', {
      url: 'https://api.example.com/hook',
      method: 'POST',
      body: '{"key":"value"}',
    })

    const result = await stepHandlers.webhook(step, makeContext(), makeServiceClient(), {})

    expect(result.success).toBe(true)
    expect(result.outputPayload?.statusCode).toBe(200)
    expect(result.outputPayload?.responseBody).toBe('OK')
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/hook',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('resolves {{variables}} in URL', async () => {
    const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>
    mockFetch.mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve('') })

    const step = makeStep('webhook', {
      url: 'https://api.com/{{clientId}}',
      method: 'GET',
    })
    const variableContext: VariableContext = { clientId: '123' }

    await stepHandlers.webhook(step, makeContext(), makeServiceClient(), variableContext)

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.com/123',
      expect.anything()
    )
  })

  it('resolves {{variables}} in body', async () => {
    const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>
    mockFetch.mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve('') })

    const step = makeStep('webhook', {
      url: 'https://api.example.com/hook',
      method: 'POST',
      body: '{"name":"{{userName}}"}',
    })
    const variableContext: VariableContext = { userName: 'Alice' }

    await stepHandlers.webhook(step, makeContext(), makeServiceClient(), variableContext)

    const callArgs = mockFetch.mock.calls[0][1]
    expect(callArgs.body).toBe('{"name":"Alice"}')
  })

  it('resolves {{variables}} in headers', async () => {
    const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>
    mockFetch.mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve('') })

    const step = makeStep('webhook', {
      url: 'https://api.example.com/hook',
      method: 'POST',
      headers: { Authorization: 'Bearer {{token}}' },
    })
    const variableContext: VariableContext = { token: 'abc123' }

    await stepHandlers.webhook(step, makeContext(), makeServiceClient(), variableContext)

    const callArgs = mockFetch.mock.calls[0][1]
    expect(callArgs.headers).toEqual(
      expect.objectContaining({ Authorization: 'Bearer abc123' })
    )
  })

  it('GET request does NOT attach body', async () => {
    const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>
    mockFetch.mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve('') })

    const step = makeStep('webhook', {
      url: 'https://api.example.com/hook',
      method: 'GET',
      body: '{"should":"not be sent"}',
    })

    await stepHandlers.webhook(step, makeContext(), makeServiceClient(), {})

    const callArgs = mockFetch.mock.calls[0][1]
    expect(callArgs.body).toBeUndefined()
  })

  it('non-2xx response returns error with status code', async () => {
    const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>
    mockFetch.mockResolvedValue({
      ok: false,
      status: 503,
      text: () => Promise.resolve('Service Unavailable'),
    })

    const step = makeStep('webhook', {
      url: 'https://api.example.com/hook',
      method: 'POST',
    })

    const result = await stepHandlers.webhook(step, makeContext(), makeServiceClient(), {})

    expect(result.success).toBe(false)
    expect(result.error).toContain('503')
  })

  describe('SSRF protection', () => {
    const ssrfCases = [
      ['localhost', 'http://localhost/hook'],
      ['127.0.0.1', 'http://127.0.0.1/hook'],
      ['10.0.0.1', 'http://10.0.0.1/hook'],
      ['192.168.1.1', 'http://192.168.1.1/hook'],
      ['172.16.0.1', 'http://172.16.0.1/hook'],
      ['example.local', 'http://example.local/hook'],
      ['0.0.0.0', 'http://0.0.0.0/hook'],
    ] as const

    for (const [label, url] of ssrfCases) {
      it(`blocks ${label}`, async () => {
        const step = makeStep('webhook', { url, method: 'GET' })
        const result = await stepHandlers.webhook(step, makeContext(), makeServiceClient(), {})

        expect(result.success).toBe(false)
        expect(result.error).toContain('private/internal')
      })
    }
  })

  it('invalid URL returns error', async () => {
    const step = makeStep('webhook', {
      url: 'not-a-valid-url',
      method: 'GET',
    })

    const result = await stepHandlers.webhook(step, makeContext(), makeServiceClient(), {})

    expect(result.success).toBe(false)
    expect(result.error).toContain('Invalid webhook URL')
  })

  it('fetch failure returns error', async () => {
    const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>
    mockFetch.mockRejectedValue(new Error('Network error'))

    const step = makeStep('webhook', {
      url: 'https://api.example.com/hook',
      method: 'POST',
    })

    const result = await stepHandlers.webhook(step, makeContext(), makeServiceClient(), {})

    expect(result.success).toBe(false)
    expect(result.error).toContain('Network error')
  })

  it('timeout returns "timed out after 10s"', async () => {
    const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>
    mockFetch.mockRejectedValue(new DOMException('The operation was aborted', 'TimeoutError'))

    const step = makeStep('webhook', {
      url: 'https://api.example.com/hook',
      method: 'POST',
    })

    const result = await stepHandlers.webhook(step, makeContext(), makeServiceClient(), {})

    expect(result.success).toBe(false)
    expect(result.error).toContain('timed out after 10s')
  })

  it('step_config.type mismatch returns error', async () => {
    const step = makeStep('delay', { url: 'https://api.example.com', method: 'GET' })

    const result = await stepHandlers.webhook(step, makeContext(), makeServiceClient(), {})

    expect(result.success).toBe(false)
    expect(result.error).toContain('type mismatch')
  })
})

describe('handleN8nStep / dispatchToN8n (stepHandlers.send_email / stepHandlers.ai_action)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    vi.stubEnv('N8N_WORKFLOW_EXECUTOR_URL', 'https://n8n.example.com/webhook/xxx')
    vi.stubEnv('HOST_URL', 'https://cms.example.com')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('successful dispatch returns { success: true, async: true }', async () => {
    const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>
    mockFetch.mockResolvedValue({ ok: true, status: 200 })

    const step = makeStep('send_email', { template_id: 'tpl-1' })
    const result = await stepHandlers.send_email(
      step,
      makeContext(),
      makeServiceClient(),
      { trigger_type: 'manual' }
    )

    expect(result).toEqual({ success: true, async: true })
  })

  it('sends correct payload to n8n', async () => {
    const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>
    mockFetch.mockResolvedValue({ ok: true, status: 200 })

    const step = makeStep('send_email', { template_id: 'tpl-1' })
    const context = makeContext({
      executionId: 'exec-42',
      stepExecutionId: 'step-exec-99',
    })
    const variableContext: VariableContext = { trigger_type: 'manual', foo: 'bar' }

    await stepHandlers.send_email(step, context, makeServiceClient(), variableContext)

    expect(mockFetch).toHaveBeenCalledWith(
      'https://n8n.example.com/webhook/xxx',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    )

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body).toEqual({
      executionId: 'exec-42',
      stepExecutionId: 'step-exec-99',
      stepType: 'send_email',
      stepConfig: step.step_config,
      triggerPayload: variableContext,
      callbackUrl: 'https://cms.example.com',
    })
  })

  it('missing N8N_WORKFLOW_EXECUTOR_URL returns error', async () => {
    vi.stubEnv('N8N_WORKFLOW_EXECUTOR_URL', '')

    const step = makeStep('send_email', {})
    const result = await stepHandlers.send_email(step, makeContext(), makeServiceClient(), {})

    expect(result.success).toBe(false)
    expect(result.error).toContain('N8N_WORKFLOW_EXECUTOR_URL')
  })

  it('missing HOST_URL returns error', async () => {
    vi.stubEnv('HOST_URL', '')

    const step = makeStep('ai_action', {})
    const result = await stepHandlers.ai_action(step, makeContext(), makeServiceClient(), {})

    expect(result.success).toBe(false)
    expect(result.error).toContain('HOST_URL')
  })

  it('non-200 response returns error with status', async () => {
    const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>
    mockFetch.mockResolvedValue({ ok: false, status: 502, statusText: 'Bad Gateway' })

    const step = makeStep('send_email', {})
    const result = await stepHandlers.send_email(step, makeContext(), makeServiceClient(), {})

    expect(result.success).toBe(false)
    expect(result.error).toContain('502')
  })

  it('fetch failure returns error', async () => {
    const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>
    mockFetch.mockRejectedValue(new Error('ECONNREFUSED'))

    const step = makeStep('send_email', {})
    const result = await stepHandlers.send_email(step, makeContext(), makeServiceClient(), {})

    expect(result.success).toBe(false)
    expect(result.error).toContain('ECONNREFUSED')
  })
})
