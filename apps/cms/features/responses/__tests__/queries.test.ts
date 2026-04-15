import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createClient } from '@/lib/supabase/client'
import { getResponseAiActionResults } from '../queries'

// createClient is mocked globally in vitest.setup.ts — we override per test
const mockCreateClient = createClient as ReturnType<typeof vi.fn>

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/**
 * Build a mock Supabase client object that handles the two sequential .from() calls:
 * 1. workflow_executions (returns executions list) — select spy captured for assertions
 * 2. workflow_step_executions (returns step executions with joins)
 *
 * Returns the mock supabase object (has `.from`) plus the spy on the first select call.
 */
function buildTwoStepClient(
  executionsResponse: { data: unknown; error: unknown },
  stepExecsResponse: { data: unknown; error: unknown }
): { supabase: { from: ReturnType<typeof vi.fn> }; executionsSelectSpy: ReturnType<typeof vi.fn> } {
  let callIndex = 0
  const responses = [executionsResponse, stepExecsResponse]
  const executionsSelectSpy = vi.fn()

  const supabase = {
    from: vi.fn(() => {
      const response = responses[callIndex] ?? responses[responses.length - 1]
      const isFirstCall = callIndex === 0
      callIndex++

      const chain: Record<string, unknown> = {}
      chain.select = isFirstCall
        ? vi.fn((...args: unknown[]) => { executionsSelectSpy(...args); return chain })
        : vi.fn().mockReturnValue(chain)
      chain.in = vi.fn().mockReturnValue(chain)
      chain.not = vi.fn().mockReturnValue(chain)
      chain.order = vi.fn().mockReturnValue(chain)
      chain.then = (resolve: (v: unknown) => unknown) =>
        Promise.resolve(response).then(resolve)
      return chain
    }),
  }

  return { supabase, executionsSelectSpy }
}

/**
 * Build a mock execution row where trigger_payload contains the given responseId
 */
function buildExecution(id: string, responseId: string) {
  return {
    id,
    trigger_payload: { responseId, surveyLinkId: 'link-1' },
  }
}

/**
 * Build a mock workflow_step_executions row with nested join data.
 * step_config carries output_schema — the field label definitions entered by the user
 * in the AI Action config panel.
 */
function buildAiStepExecution(overrides: {
  workflowName?: string
  outputPayload?: Record<string, unknown>
  completedAt?: string | null
  stepType?: string
  stepConfig?: Record<string, unknown> | null
}) {
  return {
    output_payload: overrides.outputPayload ?? { overallScore: 8, recommendation: 'QUALIFIED' },
    completed_at: overrides.completedAt !== undefined ? overrides.completedAt : '2026-04-12T10:00:00Z',
    workflow_executions: {
      trigger_payload: { responseId: 'response-1' },
      workflows: { name: overrides.workflowName ?? 'Lead Scoring Workflow' },
    },
    workflow_steps: {
      step_type: overrides.stepType ?? 'ai_action',
      step_config: overrides.stepConfig !== undefined
        ? overrides.stepConfig
        : {
            output_schema: [
              { key: 'overallScore', label: 'Ocena ogólna', type: 'number' },
              { key: 'recommendation', label: 'Rekomendacja', type: 'string' },
            ],
          },
    },
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

/** Convenience: wire a two-step client into the mock and return the select spy */
function mockWithTwoStepClient(
  executionsResponse: { data: unknown; error: unknown },
  stepExecsResponse: { data: unknown; error: unknown }
): ReturnType<typeof vi.fn> {
  const { supabase, executionsSelectSpy } = buildTwoStepClient(executionsResponse, stepExecsResponse)
  mockCreateClient.mockReturnValue(supabase)
  return executionsSelectSpy
}

describe('getResponseAiActionResults', () => {
  describe('select() argument — trigger_payload must be fetched', () => {
    it('calls .select() with trigger_payload so client-side filter has data to match', async () => {
      const selectSpy = mockWithTwoStepClient({ data: [], error: null }, { data: [], error: null })

      await getResponseAiActionResults('response-1')

      expect(selectSpy).toHaveBeenCalledWith(expect.stringContaining('trigger_payload'))
    })
  })

  describe('when no workflow executions exist for the response', () => {
    it('returns empty array when executions query returns empty data', async () => {
      mockWithTwoStepClient({ data: [], error: null }, { data: [], error: null })

      const result = await getResponseAiActionResults('response-1')

      expect(result).toEqual([])
    })

    it('returns empty array when executions query returns null', async () => {
      mockWithTwoStepClient({ data: null, error: null }, { data: [], error: null })

      const result = await getResponseAiActionResults('response-1')

      expect(result).toEqual([])
    })
  })

  describe('when executions exist but none match the responseId', () => {
    it('returns empty array when trigger_payload responseId does not match', async () => {
      const executions = [buildExecution('exec-1', 'different-response-id')]
      mockWithTwoStepClient({ data: executions, error: null }, { data: [], error: null })

      const result = await getResponseAiActionResults('response-1')

      expect(result).toEqual([])
    })
  })

  describe('when matching executions exist', () => {
    it('returns AI action results with correct shape', async () => {
      const executions = [buildExecution('exec-1', 'response-1')]
      const stepExecs = [buildAiStepExecution({})]

      mockWithTwoStepClient(
        { data: executions, error: null },
        { data: stepExecs, error: null }
      )

      const result = await getResponseAiActionResults('response-1')

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        workflowName: 'Lead Scoring Workflow',
        outputPayload: { overallScore: 8, recommendation: 'QUALIFIED' },
        completedAt: '2026-04-12T10:00:00Z',
        outputSchema: [
          { key: 'overallScore', label: 'Ocena ogólna', type: 'number' },
          { key: 'recommendation', label: 'Rekomendacja', type: 'string' },
        ],
      })
    })

    it('filters out non-ai_action steps', async () => {
      const executions = [buildExecution('exec-1', 'response-1')]
      const stepExecs = [
        buildAiStepExecution({ stepType: 'send_email' }),
        buildAiStepExecution({ stepType: 'ai_action', workflowName: 'AI Flow' }),
        buildAiStepExecution({ stepType: 'condition' }),
      ]

      mockWithTwoStepClient(
        { data: executions, error: null },
        { data: stepExecs, error: null }
      )

      const result = await getResponseAiActionResults('response-1')

      expect(result).toHaveLength(1)
      expect(result[0].workflowName).toBe('AI Flow')
    })

    it('returns multiple ai_action results from multiple executions', async () => {
      const executions = [
        buildExecution('exec-1', 'response-1'),
        buildExecution('exec-2', 'response-1'),
      ]
      const stepExecs = [
        buildAiStepExecution({ workflowName: 'Flow A', completedAt: '2026-04-12T09:00:00Z' }),
        buildAiStepExecution({ workflowName: 'Flow B', completedAt: '2026-04-12T10:00:00Z' }),
      ]

      mockWithTwoStepClient(
        { data: executions, error: null },
        { data: stepExecs, error: null }
      )

      const result = await getResponseAiActionResults('response-1')

      expect(result).toHaveLength(2)
      expect(result[0].workflowName).toBe('Flow A')
      expect(result[1].workflowName).toBe('Flow B')
    })

    it('returns outputSchema from step_config.output_schema', async () => {
      const executions = [buildExecution('exec-1', 'response-1')]
      const stepExecs = [buildAiStepExecution({
        stepConfig: {
          output_schema: [
            { key: 'concerns', label: 'Wątpliwości', type: 'string' },
            { key: 'aiResponse', label: 'Analiza AI', type: 'string' },
          ],
        },
      })]

      mockWithTwoStepClient({ data: executions, error: null }, { data: stepExecs, error: null })

      const result = await getResponseAiActionResults('response-1')

      expect(result[0].outputSchema).toEqual([
        { key: 'concerns', label: 'Wątpliwości', type: 'string' },
        { key: 'aiResponse', label: 'Analiza AI', type: 'string' },
      ])
    })

    it('returns empty outputSchema when step_config is null', async () => {
      const executions = [buildExecution('exec-1', 'response-1')]
      const stepExecs = [buildAiStepExecution({ stepConfig: null })]

      mockWithTwoStepClient({ data: executions, error: null }, { data: stepExecs, error: null })

      const result = await getResponseAiActionResults('response-1')

      expect(result[0].outputSchema).toEqual([])
    })

    it('handles null completedAt (step still running)', async () => {
      const executions = [buildExecution('exec-1', 'response-1')]
      const stepExecs = [buildAiStepExecution({ completedAt: null })]

      mockWithTwoStepClient(
        { data: executions, error: null },
        { data: stepExecs, error: null }
      )

      const result = await getResponseAiActionResults('response-1')

      expect(result[0].completedAt).toBeNull()
    })
  })

  describe('error handling', () => {
    it('throws when workflow_executions query fails', async () => {
      const dbError = { message: 'RLS violation on workflow_executions' }
      mockWithTwoStepClient({ data: null, error: dbError }, { data: null, error: null })

      await expect(getResponseAiActionResults('response-1')).rejects.toEqual(dbError)
    })

    it('throws when workflow_step_executions query fails', async () => {
      const executions = [buildExecution('exec-1', 'response-1')]
      const dbError = { message: 'RLS violation on workflow_step_executions' }

      mockWithTwoStepClient(
        { data: executions, error: null },
        { data: null, error: dbError }
      )

      await expect(getResponseAiActionResults('response-1')).rejects.toEqual(dbError)
    })
  })
})
