/**
 * Connection Manager tests
 *
 * Mocks Supabase client to test DB query logic and row transformation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getConnectionForSurveyLink,
  getConnectionsForTenant,
  getDefaultConnection,
  getConnectionById,
} from '../connection-manager'

// ---------------------------------------------------------------------------
// Mock Supabase client builder
// ---------------------------------------------------------------------------

function createMockSupabase(overrides?: Record<string, unknown>) {
  const chain: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    ...overrides,
  }

  return {
    from: vi.fn().mockReturnValue(chain),
    _chain: chain,
  } as unknown as ReturnType<typeof createMockSupabase>
}

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const decryptedRow = {
  id: 'conn-123',
  tenant_id: 'tenant-abc',
  user_id: null,
  provider: 'google',
  display_name: 'Work Calendar',
  credentials: {
    access_token: 'tok',
    refresh_token: 'ref',
    expiry_date: 1000000,
    scope: 'calendar',
    email: 'test@example.com',
  },
  calendar_url: null,
  account_identifier: 'test@example.com',
  is_default: true,
  is_active: true,
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('connection-manager', () => {
  describe('getConnectionForSurveyLink', () => {
    it('resolves calendar_connection_id from survey_links then fetches decrypted connection', async () => {
      // Build two separate chains: one for survey_links, one for calendar_connections_decrypted
      let callCount = 0

      const supabase = {
        from: vi.fn().mockImplementation((table: string) => {
          callCount++

          if (table === 'survey_links') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { calendar_connection_id: 'conn-123' },
                    error: null,
                  }),
                }),
              }),
            }
          }

          // calendar_connections_decrypted
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: decryptedRow,
                  error: null,
                }),
              }),
            }),
          }
        }),
      }

      const result = await getConnectionForSurveyLink('link-1', supabase as any)

      expect(result.isOk()).toBe(true)
      const connection = result._unsafeUnwrap()
      expect(connection.id).toBe('conn-123')
      expect(connection.tenantId).toBe('tenant-abc')
      expect(connection.provider).toBe('google')
      expect(connection.isDefault).toBe(true)
    })

    it('returns error when survey link has no calendar_connection_id', async () => {
      const supabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { calendar_connection_id: null },
                error: null,
              }),
            }),
          }),
        }),
      }

      const result = await getConnectionForSurveyLink('link-1', supabase as any)

      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr()).toContain('no calendar connection')
    })
  })

  describe('getConnectionsForTenant', () => {
    it('returns all active connections mapped to domain model', async () => {
      const supabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [decryptedRow, { ...decryptedRow, id: 'conn-456', is_default: false }],
                error: null,
              }),
            }),
          }),
        }),
      }

      const result = await getConnectionsForTenant(supabase as any)

      expect(result.isOk()).toBe(true)
      const connections = result._unsafeUnwrap()
      expect(connections).toHaveLength(2)
      expect(connections[0].isDefault).toBe(true)
      expect(connections[1].id).toBe('conn-456')
    })
  })

  describe('getDefaultConnection', () => {
    it('returns default connection (is_default=true, user_id IS NULL)', async () => {
      const supabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: decryptedRow,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }

      const result = await getDefaultConnection(supabase as any)

      expect(result.isOk()).toBe(true)
      expect(result._unsafeUnwrap().isDefault).toBe(true)
    })

    it('returns error when no default connection exists', async () => {
      const supabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'No rows returned' },
                }),
              }),
            }),
          }),
        }),
      }

      const result = await getDefaultConnection(supabase as any)

      expect(result.isErr()).toBe(true)
      expect(result._unsafeUnwrapErr()).toContain('No default calendar connection')
    })
  })

  describe('getConnectionById', () => {
    it('returns connection by ID', async () => {
      const supabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: decryptedRow,
                error: null,
              }),
            }),
          }),
        }),
      }

      const result = await getConnectionById('conn-123', supabase as any)

      expect(result.isOk()).toBe(true)
      expect(result._unsafeUnwrap().id).toBe('conn-123')
    })
  })
})
