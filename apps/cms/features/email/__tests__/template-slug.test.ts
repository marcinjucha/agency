import { describe, it, expect } from 'vitest'
import { templateSlugSchema } from '../validation'

describe('templateSlugSchema', () => {
  it.each([
    ['form_confirmation'],
    ['workflow_custom'],
    ['marketing_blast'],
    ['a'],
    ['a1'],
    ['hello_world_42'],
  ])('accepts valid slug "%s"', (slug) => {
    expect(templateSlugSchema.safeParse(slug).success).toBe(true)
  })

  it.each([
    ['', 'empty'],
    ['A', 'uppercase start'],
    ['1foo', 'digit start'],
    ['_foo', 'underscore start'],
    ['foo-bar', 'dash forbidden'],
    ['foo bar', 'space forbidden'],
    ['foo.bar', 'dot forbidden'],
    ['FOO', 'uppercase letters'],
    ['a'.repeat(51), 'too long (>50)'],
  ])('rejects invalid slug "%s" (%s)', (slug) => {
    expect(templateSlugSchema.safeParse(slug).success).toBe(false)
  })
})
