import type { StepHandlerRegistry, ActionResult, ExecutionContext } from './types'
import type { WorkflowStep, StepType } from '../types'
import { resolveVariables } from './utils'

// --- N8n dispatch (shared by send_email, ai_action, delay) ---

/**
 * Dispatches a step to n8n for async execution.
 *
 * WHY fire-and-forget: n8n handles retries, delays, and external API calls
 * that would exceed Vercel/Next.js timeouts. The callback endpoint (iteration 4)
 * will mark the step completed/failed when n8n finishes.
 */
async function dispatchToN8n(
  step: WorkflowStep,
  context: ExecutionContext,
  triggerPayload: Record<string, unknown>
): Promise<ActionResult> {
  const n8nUrl = process.env.N8N_WORKFLOW_EXECUTOR_URL
  if (!n8nUrl) {
    return {
      success: false,
      error: 'N8N_WORKFLOW_EXECUTOR_URL environment variable is not configured.',
    }
  }

  const callbackUrl = process.env.WORKFLOW_CALLBACK_URL
  if (!callbackUrl) {
    return {
      success: false,
      error: 'WORKFLOW_CALLBACK_URL environment variable is not configured.',
    }
  }

  try {
    const response = await fetch(n8nUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        executionId: context.executionId,
        stepExecutionId: context.stepExecutionId,
        stepType: step.step_type,
        stepConfig: step.step_config,
        triggerPayload,
        callbackUrl,
      }),
    })

    if (!response.ok) {
      return {
        success: false,
        error: `n8n dispatch failed with status ${response.status}: ${response.statusText}`,
      }
    }

    // Step dispatched — n8n will callback when done
    return { success: true, async: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown fetch error'
    return {
      success: false,
      error: `Failed to dispatch to n8n: ${message}`,
    }
  }
}

// --- Step types that are dispatched to n8n (async) ---

const N8N_ASYNC_STEP_TYPES: ReadonlySet<StepType> = new Set([
  'send_email',
  'ai_action',
  'delay',
])

/**
 * Returns true if a step type is handled asynchronously by n8n.
 * Used by the executor to decide whether to mark the step completed
 * or leave it in 'running' status for callback completion.
 */
export function isAsyncStepType(stepType: string): boolean {
  return N8N_ASYNC_STEP_TYPES.has(stepType as StepType)
}

// --- Individual handlers ---

/**
 * Shared handler for all n8n-dispatched step types (send_email, ai_action, delay).
 * Each type gets its own entry in the registry for future differentiation,
 * but currently they all delegate to dispatchToN8n identically.
 */
const handleN8nStep: StepHandlerRegistry[string] = async (
  step,
  context,
  _serviceClient,
  variableContext
) => {
  return dispatchToN8n(step, context, variableContext as Record<string, unknown>)
}

/**
 * webhook — Executes synchronously in CMS (fast HTTP call, no n8n needed).
 * Resolves {{variables}} in URL and body before sending.
 */
const handleWebhook: StepHandlerRegistry[string] = async (
  step,
  context,
  _serviceClient,
  variableContext
) => {
  if (step.step_config.type !== 'webhook') {
    return { success: false, error: 'Step config type mismatch: expected webhook' }
  }

  const { url, method, headers, body } = step.step_config

  const resolvedUrl = resolveVariables(url, variableContext)

  // SSRF protection: block requests to private/internal IPs
  try {
    const parsed = new URL(resolvedUrl)
    const hostname = parsed.hostname.toLowerCase()

    const isPrivate =
      hostname === 'localhost' ||
      hostname === '[::1]' ||
      hostname.startsWith('127.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('169.254.') ||
      /^172\.(1[6-9]|2[0-9]|3[01])\./.test(hostname) ||
      hostname.endsWith('.local') ||
      hostname === '0.0.0.0'

    if (isPrivate) {
      return { success: false, error: `Webhook URL targets a private/internal address: ${hostname}` }
    }
  } catch {
    return { success: false, error: `Invalid webhook URL: ${resolvedUrl}` }
  }

  const resolvedBody = body ? resolveVariables(body, variableContext) : undefined

  // Resolve {{variables}} in header values
  const resolvedHeaders: Record<string, string> = { 'Content-Type': 'application/json' }
  if (headers) {
    for (const [key, value] of Object.entries(headers)) {
      resolvedHeaders[key] = resolveVariables(value, variableContext)
    }
  }

  try {
    const fetchOptions: RequestInit = {
      method,
      headers: resolvedHeaders,
      signal: AbortSignal.timeout(10_000),
    }

    // Only attach body for methods that support it
    if (resolvedBody && method !== 'GET') {
      fetchOptions.body = resolvedBody
    }

    const response = await fetch(resolvedUrl, fetchOptions)

    let responseBody: string | undefined
    try {
      responseBody = await response.text()
    } catch {
      // Response body unreadable — not critical
    }

    if (!response.ok) {
      return {
        success: false,
        error: `Webhook returned HTTP ${response.status}`,
        outputPayload: {
          statusCode: response.status,
          responseBody,
        },
      }
    }

    return {
      success: true,
      outputPayload: {
        statusCode: response.status,
        responseBody,
      },
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'TimeoutError') {
      return { success: false, error: 'Webhook timed out after 10s' }
    }
    const message = err instanceof Error ? err.message : 'Unknown fetch error'
    return {
      success: false,
      error: `Webhook request failed: ${message}`,
    }
  }
}

// --- Registry ---

export const stepHandlers: StepHandlerRegistry = {
  // n8n-dispatched steps — each type gets its own entry for future differentiation
  send_email: handleN8nStep,
  ai_action: handleN8nStep,
  delay: handleN8nStep,
  webhook: handleWebhook,
}
