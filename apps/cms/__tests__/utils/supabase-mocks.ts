import { vi } from 'vitest'

/**
 * Creates a chainable Supabase mock where each method returns the chain,
 * and terminal methods resolve to the given value.
 *
 * Supports: .select(), .insert(), .update(), .delete(), .upsert(),
 * .eq(), .in(), .limit(), .order(), .range(), .single(), .maybeSingle(),
 * .rpc(), .then(), .catch()
 */
export function mockChain(finalValue: unknown) {
  const chain: Record<string, any> = {}
  chain.select = vi.fn().mockReturnValue(chain)
  chain.insert = vi.fn().mockReturnValue(chain)
  chain.update = vi.fn().mockReturnValue(chain)
  chain.delete = vi.fn().mockReturnValue(chain)
  chain.upsert = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.in = vi.fn().mockReturnValue(chain)
  chain.limit = vi.fn().mockReturnValue(chain)
  chain.order = vi.fn().mockReturnValue(chain)
  chain.range = vi.fn().mockReturnValue(chain)
  chain.rpc = vi.fn().mockResolvedValue(finalValue)
  chain.single = vi.fn().mockResolvedValue(finalValue)
  chain.maybeSingle = vi.fn().mockResolvedValue(finalValue)
  chain.then = (resolve: any, reject?: any) =>
    Promise.resolve(finalValue).then(resolve, reject)
  chain.catch = (fn: any) => Promise.resolve(finalValue).catch(fn)
  return chain
}

/**
 * Creates a mock Supabase client where each `.from()` call returns
 * the next response in sequence. Last response is reused for subsequent calls.
 *
 * Use when test code makes multiple `.from()` calls in order (e.g., insert workflow, insert steps, insert edges).
 */
export function createSequentialClient(
  ...responses: Array<{ data: any; error: any }>
) {
  let callIndex = 0
  const client: any = {
    from: vi.fn(() => {
      const response = responses[callIndex] ?? responses[responses.length - 1]
      callIndex++
      const chain: any = {}
      chain.select = vi.fn().mockReturnValue(chain)
      chain.eq = vi.fn().mockReturnValue(chain)
      chain.order = vi.fn().mockReturnValue(chain)
      chain.range = vi.fn().mockReturnValue(chain)
      chain.maybeSingle = vi.fn().mockResolvedValue(response)
      chain.then = (resolve: any) => Promise.resolve(response).then(resolve)
      return chain
    }),
  }
  return client
}

/**
 * Table-name-based mock for Supabase service client.
 * Each `.from(tableName)` call returns the next response in queue for that table.
 * Last response is reused for subsequent calls beyond the queue.
 *
 * Use for executor-style tests with many DB calls across different tables.
 */
export function createTableMockClient(
  config: Record<string, Array<{ data: unknown; error: unknown }>>
) {
  const queues: Record<string, number> = {}

  return {
    from: vi.fn((table: string) => {
      queues[table] = queues[table] || 0
      const responses = config[table] || [{ data: null, error: null }]
      const response =
        responses[queues[table]] || responses[responses.length - 1]
      queues[table]++

      const chain: Record<string, unknown> = {}
      chain.select = vi.fn().mockReturnValue(chain)
      chain.insert = vi.fn().mockReturnValue(chain)
      chain.update = vi.fn().mockReturnValue(chain)
      chain.eq = vi.fn().mockReturnValue(chain)
      chain.in = vi.fn().mockReturnValue(chain)
      chain.order = vi.fn().mockReturnValue(chain)
      chain.maybeSingle = vi.fn().mockResolvedValue(response)
      chain.single = vi.fn().mockResolvedValue(response)
      chain.then = (resolve: (v: unknown) => unknown) =>
        Promise.resolve(response).then(resolve)
      return chain
    }),
  }
}
