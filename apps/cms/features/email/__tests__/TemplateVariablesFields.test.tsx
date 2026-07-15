import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TemplateVariablesFields } from '../components/TemplateVariablesFields'
import { messages } from '@/lib/messages'
import type { TemplateVariableField } from '../utils/resolve-template-variables'

// ---------------------------------------------------------------------------
// Behavior-pinning tests for TemplateVariablesFields (Iter 5).
//
// Deliberate exception to the "components/ are not tested by default" rule
// (apps/cms/CLAUDE.md): this is a REUSABLE presentational seam whose CONTRACT
// (the merged-map onChange) is what the send path depends on. We assert on
// roles/text/values — never a DOM snapshot — so the tests survive markup churn
// and only break when the contract breaks.
//
// Plain vitest matchers only (no jest-dom) — matches the existing render-test
// convention in this package (getByRole/getByText throw when absent).
// ---------------------------------------------------------------------------

const twoFields: TemplateVariableField[] = [
  { key: 'firstName', label: 'Imię', description: 'Imię odbiorcy' },
  { key: 'company', label: 'Firma' }, // no description
]

describe('TemplateVariablesFields', () => {
  describe('empty state', () => {
    it('renders the empty message and NO hint / inputs when variables=[]', () => {
      render(<TemplateVariablesFields variables={[]} values={{}} onChange={vi.fn()} />)

      expect(screen.getByText(messages.email.templateVariablesEmpty)).toBeTruthy()
      expect(screen.queryByText(messages.email.templateVariablesHint)).toBeNull()
      expect(screen.queryByRole('textbox')).toBeNull()
    })
  })

  describe('rendering variables', () => {
    it('renders one textbox per variable plus the hint', () => {
      render(<TemplateVariablesFields variables={twoFields} values={{}} onChange={vi.fn()} />)

      expect(screen.getByText(messages.email.templateVariablesHint)).toBeTruthy()
      expect(screen.getAllByRole('textbox')).toHaveLength(2)
    })

    it('shows each variable label and its {{key}} chip', () => {
      render(<TemplateVariablesFields variables={twoFields} values={{}} onChange={vi.fn()} />)

      // Label ties to the input → accessible name is the label text.
      expect(screen.getByRole('textbox', { name: 'Imię' })).toBeTruthy()
      expect(screen.getByRole('textbox', { name: 'Firma' })).toBeTruthy()

      // Visible {{key}} chip for each variable.
      expect(screen.getByText('{{firstName}}')).toBeTruthy()
      expect(screen.getByText('{{company}}')).toBeTruthy()
    })

    it('renders description when present and omits it when absent', () => {
      render(<TemplateVariablesFields variables={twoFields} values={{}} onChange={vi.fn()} />)

      expect(screen.getByText('Imię odbiorcy')).toBeTruthy()
      // `company` has no description — nothing in the tree renders a description for it.
      expect(screen.queryByText(/odbiorcy firmy/i)).toBeNull()
    })

    it('falls back to the key as the label when label is missing', () => {
      const noLabel: TemplateVariableField[] = [{ key: 'orderId' }]
      render(<TemplateVariablesFields variables={noLabel} values={{}} onChange={vi.fn()} />)

      // Accessible name = key, since label ?? key.
      expect(screen.getByRole('textbox', { name: 'orderId' })).toBeTruthy()
    })
  })

  describe('controlled values', () => {
    it('shows values[key] for a present key and empty string for an absent one', () => {
      render(
        <TemplateVariablesFields
          variables={twoFields}
          values={{ firstName: 'Ada' }}
          onChange={vi.fn()}
        />,
      )

      const imie = screen.getByRole('textbox', { name: 'Imię' }) as HTMLInputElement
      const firma = screen.getByRole('textbox', { name: 'Firma' }) as HTMLInputElement
      expect(imie.value).toBe('Ada')
      expect(firma.value).toBe('')
    })
  })

  describe('onChange merged-map contract', () => {
    it('emits the full map with existing keys preserved and the edited key set', () => {
      const onChange = vi.fn()
      render(
        <TemplateVariablesFields
          variables={twoFields}
          values={{ firstName: 'Ada' }}
          onChange={onChange}
        />,
      )

      fireEvent.change(screen.getByRole('textbox', { name: 'Firma' }), {
        target: { value: 'Acme' },
      })

      expect(onChange).toHaveBeenCalledTimes(1)
      expect(onChange).toHaveBeenCalledWith({ firstName: 'Ada', company: 'Acme' })
    })
  })

  describe('disabled', () => {
    it('propagates disabled to every input', () => {
      render(
        <TemplateVariablesFields variables={twoFields} values={{}} onChange={vi.fn()} disabled />,
      )

      for (const input of screen.getAllByRole('textbox')) {
        expect((input as HTMLInputElement).disabled).toBe(true)
      }
    })
  })
})
