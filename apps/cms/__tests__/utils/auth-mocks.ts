import { vi } from 'vitest'
import { mockChain } from './supabase-mocks'

/**
 * Creates a mock successful auth result matching requireAuth() return shape.
 * Includes a Supabase client mock with chainable `.from()`.
 *
 * Returns `_chain` and `_supabase` for test assertions.
 */
export function mockAuthSuccess(
  overrides?: Partial<{
    tenantId: string
    userId: string
    isSuperAdmin: boolean
    roleName: string
    permissions: string[]
  }>
) {
  const supabaseChain = mockChain({ data: null, error: null })
  const supabase = { from: vi.fn(() => supabaseChain) }
  return {
    success: true as const,
    data: {
      supabase,
      userId: overrides?.userId ?? 'user-1',
      tenantId: overrides?.tenantId ?? 'tenant-1',
      tenantName: 'Test',
      isSuperAdmin: overrides?.isSuperAdmin ?? false,
      roleName: overrides?.roleName ?? 'admin',
      permissions: overrides?.permissions ?? ['workflows'],
    },
    _chain: supabaseChain,
    _supabase: supabase,
  }
}

/**
 * Creates a mock failed auth result matching requireAuth() return shape.
 */
export function mockAuthFailure(error?: string) {
  return { success: false as const, error: error ?? 'Unauthorized' }
}
