import { describe, it, expect } from 'vitest'
import { resolveOutputValue } from '../utils/resolveOutputValue'

describe('resolveOutputValue', () => {
  describe('plain object input', () => {
    it('returns kind: object for a plain JS object', () => {
      const result = resolveOutputValue({ overallScore: 8, recommendation: 'QUALIFIED' })
      expect(result).toEqual({ kind: 'object', data: { overallScore: 8, recommendation: 'QUALIFIED' } })
    })

    it('returns kind: object for an empty object', () => {
      const result = resolveOutputValue({})
      expect(result).toEqual({ kind: 'object', data: {} })
    })
  })

  describe('fenced JSON string with language tag', () => {
    it('parses fenced ```json block to kind: object', () => {
      const input = '```json\n{"score": 9, "label": "ok"}\n```'
      const result = resolveOutputValue(input)
      expect(result).toEqual({ kind: 'object', data: { score: 9, label: 'ok' } })
    })

    it('parses fenced ```json block with trailing whitespace on closing fence', () => {
      const input = '```json\n{"x": true}\n```  '
      const result = resolveOutputValue(input)
      expect(result).toEqual({ kind: 'object', data: { x: true } })
    })
  })

  describe('fenced JSON string without language tag', () => {
    it('parses fenced ``` block (no language) to kind: object', () => {
      const input = '```\n{"foo": "bar"}\n```'
      const result = resolveOutputValue(input)
      expect(result).toEqual({ kind: 'object', data: { foo: 'bar' } })
    })
  })

  describe('fenced block with invalid JSON inside', () => {
    it('strips fences and returns kind: text with inner content', () => {
      const input = '```json\nnot valid json at all\n```'
      const result = resolveOutputValue(input)
      expect(result).toEqual({ kind: 'text', text: 'not valid json at all' })
    })

    it('strips fences even when inner content is partial JSON', () => {
      const input = '```json\n{"broken": \n```'
      const result = resolveOutputValue(input)
      expect(result.kind).toBe('text')
    })
  })

  describe('fenced block where inner JSON is not an object', () => {
    it('returns kind: text when inner JSON parses to a string primitive', () => {
      const input = '```json\n"just a string"\n```'
      const result = resolveOutputValue(input)
      expect(result).toEqual({ kind: 'text', text: 'just a string' })
    })

    it('returns kind: text when inner JSON parses to a number', () => {
      const input = '```json\n42\n```'
      const result = resolveOutputValue(input)
      expect(result).toEqual({ kind: 'text', text: '42' })
    })
  })

  describe('plain string input (no fences)', () => {
    it('returns kind: text for a plain string', () => {
      const result = resolveOutputValue('hello world')
      expect(result).toEqual({ kind: 'text', text: 'hello world' })
    })

    it('returns kind: text for a plain JSON-like string that is not fenced', () => {
      // Not fenced → treated as plain text, not parsed
      const result = resolveOutputValue('{"key": "value"}')
      expect(result).toEqual({ kind: 'text', text: '{"key": "value"}' })
    })

    it('returns kind: text for an empty string', () => {
      const result = resolveOutputValue('')
      expect(result).toEqual({ kind: 'text', text: '' })
    })
  })

  describe('null and undefined inputs', () => {
    it('returns kind: text with "null" for null', () => {
      const result = resolveOutputValue(null)
      expect(result).toEqual({ kind: 'text', text: 'null' })
    })

    it('returns kind: text with "undefined" for undefined', () => {
      const result = resolveOutputValue(undefined)
      expect(result).toEqual({ kind: 'text', text: 'undefined' })
    })
  })

  describe('other scalar inputs', () => {
    it('converts a number to kind: text', () => {
      const result = resolveOutputValue(42)
      expect(result).toEqual({ kind: 'text', text: '42' })
    })

    it('converts a boolean to kind: text', () => {
      const result = resolveOutputValue(true)
      expect(result).toEqual({ kind: 'text', text: 'true' })
    })
  })
})
