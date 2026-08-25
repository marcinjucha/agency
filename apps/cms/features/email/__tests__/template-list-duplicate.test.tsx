import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useMutation } from '@tanstack/react-query'
import { messages } from '@/lib/messages'

// The global setup mock of @tanstack/react-router has no useRouter — the list
// needs one, so extend the mock here.
const navigate = vi.fn()
vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return { ...actual, useRouter: () => ({ navigate }) }
})

vi.mock('@/features/email/server', () => ({ duplicateEmailTemplateFn: vi.fn() }))
// Not under test, and it pulls its own lucide icons into the stub list.
vi.mock('@/components/shared/ViewModeToggle', () => ({ ViewModeToggle: () => null }))
vi.mock('../components/CreateTemplateDialog', () => ({ CreateTemplateDialog: () => null }))
vi.mock('../components/DeleteTemplateDialog', () => ({ DeleteTemplateDialog: () => null }))

import { EmailTemplateListClient } from '../components/EmailTemplateListClient'

const template = {
  id: 'tpl-1',
  type: 'form_confirmation',
  label: 'Potwierdzenie',
  subject: 'Dziękujemy',
  blocks: [],
  is_active: true,
} as never

beforeEach(() => {
  vi.clearAllMocks()
})

describe('EmailTemplateListClient — duplicate action', () => {
  it('duplicates by ROW ID and does not navigate the card', () => {
    const mutate = vi.fn()
    vi.mocked(useMutation).mockReturnValue({ mutate, isPending: false, error: null } as never)

    render(<EmailTemplateListClient templates={[template]} />)
    fireEvent.click(screen.getByLabelText(messages.email.duplicateAction))

    // Keyed by id — NOT by type, which is non-unique for workflow_custom rows.
    expect(mutate).toHaveBeenCalledWith('tpl-1')
    expect(navigate).not.toHaveBeenCalled()
  })

  it('disables the action while a duplicate is in flight', () => {
    vi.mocked(useMutation).mockReturnValue({
      mutate: vi.fn(),
      isPending: true,
      error: null,
    } as never)

    render(<EmailTemplateListClient templates={[template]} />)

    expect(screen.getByLabelText(messages.email.duplicateAction)).toHaveProperty(
      'disabled',
      true,
    )
  })
})
