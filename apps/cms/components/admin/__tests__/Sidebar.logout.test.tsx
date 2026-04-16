import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { usePermissions } from '@/contexts/permissions-context'

// Component-specific mocks (not covered by global setup)
vi.mock('@/lib/permissions', () => ({
  getRequiredPermission: vi.fn(() => null),
  isFeatureEnabled: vi.fn(() => true),
}))

vi.mock('@/features/tenants/components/TenantSwitcher', () => ({
  TenantSwitcher: () => null,
}))

import { Sidebar } from '../Sidebar'

describe('Sidebar logout', () => {
  it('clears TanStack Query cache on logout', async () => {
    const mockClear = vi.fn()
    const mockSignOut = vi.fn().mockResolvedValue({})
    const mockPush = vi.fn()

    vi.mocked(usePermissions).mockReturnValue({
      userId: 'user-1',
      permissions: [],
      isSuperAdmin: false,
      roleName: 'member',
      tenantId: 'tenant-1',
      tenantName: 'Test',
      enabledFeatures: [],
      tenants: [],
      hasPermission: () => true,
    } as any)

    vi.mocked(useNavigate).mockReturnValue(mockPush)
    vi.mocked(useRouterState).mockReturnValue({ location: { pathname: '/admin' } } as any)

    vi.mocked(useQueryClient).mockReturnValue({
      clear: mockClear,
    } as any)

    vi.mocked(createClient).mockReturnValue({
      auth: { signOut: mockSignOut },
    } as any)

    render(<Sidebar />)

    const logoutButton = screen.getByText('Wyloguj')
    fireEvent.click(logoutButton)

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled()
      expect(mockClear).toHaveBeenCalled()
      expect(mockPush).toHaveBeenCalledWith({ to: '/login' })
    })
  })
})
