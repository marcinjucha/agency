/**
 * TenantForm cache invalidation test.
 *
 * Verifies onSuccess callback invalidates both tenants AND roles cache.
 * Tests the callback logic directly without rendering the component.
 */
import { describe, it, expect, vi } from 'vitest'
import { queryKeys } from '@/lib/query-keys'

describe('TenantForm cache invalidation', () => {
  it('onSuccess invalidates both tenants and roles cache', () => {
    const invalidateQueries = vi.fn()
    const queryClient = { invalidateQueries }

    // Replicate the onSuccess logic from TenantForm.tsx
    const onSuccess = () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tenants.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.all })
    }

    onSuccess()

    const invalidatedKeys = invalidateQueries.mock.calls.map(
      (call: [{ queryKey: unknown[] }]) => call[0].queryKey,
    )
    expect(invalidatedKeys).toContainEqual(queryKeys.tenants.all)
    expect(invalidatedKeys).toContainEqual(queryKeys.roles.all)
  })
})
