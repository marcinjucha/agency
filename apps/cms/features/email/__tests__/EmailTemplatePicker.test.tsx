import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { EmailTemplatePicker } from '../components/EmailTemplatePicker'

// ---------------------------------------------------------------------------
// EmailTemplatePicker — controlled-Select contract (F2 regression pin).
//
// The picker maps `value === null` to a controlled EMPTY-STRING root value so the
// Radix Select stays CONTROLLED. If it flipped to uncontrolled (`value ?? undefined`),
// Radix would retain the last internal value and the trigger would keep showing the
// just-cleared template's label — misrepresenting a campaign that will send NO email.
// This test pins: a selected value shows its label; clearing to null shows the
// placeholder, NOT the previous label.
// ---------------------------------------------------------------------------

const OPTIONS = [
  { id: 't1', label: 'Bonusowy szablon', type: 'venture_bonus' },
  { id: 't2', label: 'Powitalny', type: 'welcome' },
]

const PLACEHOLDER = 'Wybierz szablon'

function trigger(container: HTMLElement): string {
  return container.querySelector('#email-template-picker')?.textContent ?? ''
}

describe('EmailTemplatePicker', () => {
  it('shows the selected template label on the trigger', () => {
    const { container } = render(
      <EmailTemplatePicker templates={OPTIONS} value="t1" onChange={() => {}} />,
    )
    expect(trigger(container)).toContain('Bonusowy szablon')
  })

  it('clearing to null renders the placeholder, not the previous label', () => {
    const { container, rerender } = render(
      <EmailTemplatePicker templates={OPTIONS} value="t1" onChange={() => {}} />,
    )
    expect(trigger(container)).toContain('Bonusowy szablon')

    rerender(<EmailTemplatePicker templates={OPTIONS} value={null} onChange={() => {}} />)

    const text = trigger(container)
    expect(text).toContain(PLACEHOLDER)
    expect(text).not.toContain('Bonusowy szablon')
  })

  it('stays controlled after a clear — a new selection still updates the trigger', () => {
    const { container, rerender } = render(
      <EmailTemplatePicker templates={OPTIONS} value="t1" onChange={() => {}} />,
    )
    rerender(<EmailTemplatePicker templates={OPTIONS} value={null} onChange={() => {}} />)
    rerender(<EmailTemplatePicker templates={OPTIONS} value="t2" onChange={() => {}} />)
    expect(trigger(container)).toContain('Powitalny')
  })
})
