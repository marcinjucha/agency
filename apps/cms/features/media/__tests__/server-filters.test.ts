/**
 * Tests for applyMediaItemFilters — pure helper extracted from getMediaItemsFn
 * so the filter behavior can be verified without driving the createServerFn
 * RPC pipeline (same approach as workflows server-queries tests).
 *
 * The helper takes a query builder mock that records `.eq`, `.ilike`, `.is`
 * calls and returns itself for chaining.
 */
import { describe, it, expect, vi } from 'vitest'
import { applyMediaItemFilters } from '../server'

function createQueryMock() {
  const calls: Array<{ method: string; args: unknown[] }> = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: any = {}
  query.eq = vi.fn((...args: unknown[]) => {
    calls.push({ method: 'eq', args })
    return query
  })
  query.ilike = vi.fn((...args: unknown[]) => {
    calls.push({ method: 'ilike', args })
    return query
  })
  query.is = vi.fn((...args: unknown[]) => {
    calls.push({ method: 'is', args })
    return query
  })
  return { query, calls }
}

describe('applyMediaItemFilters', () => {
  // -------------------------------------------------------------------------
  // is_downloadable filter (iter 1 delta — primary test target)
  // -------------------------------------------------------------------------

  describe('is_downloadable filter', () => {
    it('calls .eq("is_downloadable", true) when is_downloadable is true', () => {
      const { query, calls } = createQueryMock()

      applyMediaItemFilters(query, { is_downloadable: true })

      expect(calls).toContainEqual({ method: 'eq', args: ['is_downloadable', true] })
    })

    it('calls .eq("is_downloadable", false) when is_downloadable is false', () => {
      const { query, calls } = createQueryMock()

      applyMediaItemFilters(query, { is_downloadable: false })

      expect(calls).toContainEqual({ method: 'eq', args: ['is_downloadable', false] })
    })

    it('does NOT filter on is_downloadable when undefined', () => {
      const { query, calls } = createQueryMock()

      applyMediaItemFilters(query, {})

      const downloadableCalls = calls.filter(
        (c) => c.method === 'eq' && c.args[0] === 'is_downloadable'
      )
      expect(downloadableCalls).toHaveLength(0)
    })

    it('does NOT filter on is_downloadable when filters arg is undefined', () => {
      const { query, calls } = createQueryMock()

      applyMediaItemFilters(query, undefined)

      expect(calls).toHaveLength(0)
    })
  })

  // -------------------------------------------------------------------------
  // type filter
  // -------------------------------------------------------------------------

  describe('type filter', () => {
    it('calls .eq("type", "document") when type is document', () => {
      const { query, calls } = createQueryMock()

      applyMediaItemFilters(query, { type: 'document' })

      expect(calls).toContainEqual({ method: 'eq', args: ['type', 'document'] })
    })

    it('does NOT filter on type when undefined', () => {
      const { query, calls } = createQueryMock()

      applyMediaItemFilters(query, {})

      const typeCalls = calls.filter((c) => c.method === 'eq' && c.args[0] === 'type')
      expect(typeCalls).toHaveLength(0)
    })
  })

  // -------------------------------------------------------------------------
  // search filter
  // -------------------------------------------------------------------------

  describe('search filter', () => {
    it('calls .ilike("name", "%foo%") when search is "foo"', () => {
      const { query, calls } = createQueryMock()

      applyMediaItemFilters(query, { search: 'foo' })

      expect(calls).toContainEqual({ method: 'ilike', args: ['name', '%foo%'] })
    })

    it('does NOT filter on search when undefined', () => {
      const { query, calls } = createQueryMock()

      applyMediaItemFilters(query, {})

      expect(calls.filter((c) => c.method === 'ilike')).toHaveLength(0)
    })

    it('does NOT filter on search when empty string', () => {
      const { query, calls } = createQueryMock()

      applyMediaItemFilters(query, { search: '' })

      expect(calls.filter((c) => c.method === 'ilike')).toHaveLength(0)
    })
  })

  // -------------------------------------------------------------------------
  // folder_id filter (3-way distinction must be preserved)
  // -------------------------------------------------------------------------

  describe('folder_id filter', () => {
    it('calls .is("folder_id", null) when folder_id is null (root only)', () => {
      const { query, calls } = createQueryMock()

      applyMediaItemFilters(query, { folder_id: null })

      expect(calls).toContainEqual({ method: 'is', args: ['folder_id', null] })
    })

    it('calls .eq("folder_id", "uuid-1") when folder_id is a string', () => {
      const { query, calls } = createQueryMock()

      applyMediaItemFilters(query, { folder_id: 'uuid-1' })

      expect(calls).toContainEqual({ method: 'eq', args: ['folder_id', 'uuid-1'] })
    })

    it('does NOT filter on folder_id when undefined (returns all items)', () => {
      const { query, calls } = createQueryMock()

      applyMediaItemFilters(query, {})

      const folderCalls = calls.filter(
        (c) =>
          (c.method === 'eq' && c.args[0] === 'folder_id') ||
          (c.method === 'is' && c.args[0] === 'folder_id')
      )
      expect(folderCalls).toHaveLength(0)
    })
  })

  // -------------------------------------------------------------------------
  // Combined filters
  // -------------------------------------------------------------------------

  describe('combined filters', () => {
    it('applies all filters when all provided', () => {
      const { query, calls } = createQueryMock()

      applyMediaItemFilters(query, {
        type: 'document',
        search: 'invoice',
        folder_id: 'uuid-2',
        is_downloadable: true,
      })

      expect(calls).toContainEqual({ method: 'eq', args: ['type', 'document'] })
      expect(calls).toContainEqual({ method: 'ilike', args: ['name', '%invoice%'] })
      expect(calls).toContainEqual({ method: 'eq', args: ['folder_id', 'uuid-2'] })
      expect(calls).toContainEqual({ method: 'eq', args: ['is_downloadable', true] })
    })
  })
})
