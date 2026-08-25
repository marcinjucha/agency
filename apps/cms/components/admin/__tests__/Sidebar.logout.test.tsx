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
    // Sidebar calls useRouterState({ select: (s) => s.location.pathname }), so the
    // mock must APPLY the selector — returning the raw state handed the component
    // an object where it expects a string (pathname.startsWith crashed the render).
    vi.mocked(useRouterState).mockImplementation(((opts: {
      select?: (state: unknown) => unknown
    }) => {
      const state = { location: { pathname: '/admin' } }
      return opts?.select ? opts.select(state) : state
    }) as never)

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
