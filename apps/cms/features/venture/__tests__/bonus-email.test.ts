import { describe, it, expect } from 'vitest'
import {
  buildBonusEmailBlocks,
  buildBonusEmailSubject,
  buildBonusEmail,
} from '../mail/bonus-email'

const INPUT = {
  campaignDisplayName: 'Kacper Launch',
  bonuses: [
    { title: 'Szablon Notion', url: 'https://drive.example.com/notion' },
    { title: 'Checklista PDF', url: 'https://drive.example.com/pdf' },
  ],
}

describe('buildBonusEmailSubject', () => {
  it('uses the campaign display name', () => {
    expect(buildBonusEmailSubject(INPUT)).toContain('Kacper Launch')
  })

  it('falls back to Halo Efekt when display name is empty', () => {
    expect(buildBonusEmailSubject({ campaignDisplayName: null, bonuses: [] })).toContain(
      'Halo Efekt',
    )
  })
})

describe('buildBonusEmailBlocks (pure)', () => {
  it('renders each bonus as a "Zrób kopię" link with its url', () => {
    const blocks = buildBonusEmailBlocks(INPUT)
    const list = blocks.find((b) => b.id === 'bonus-list') as { content: string }
    expect(list.content).toContain('href="https://drive.example.com/notion"')
    expect(list.content).toContain('href="https://drive.example.com/pdf"')
    expect(list.content).toContain('Zrób kopię')
    expect(list.content).toContain('Szablon Notion')
  })

  it('drops bonuses without a url (cannot be delivered)', () => {
    const blocks = buildBonusEmailBlocks({
      campaignDisplayName: 'X',
      bonuses: [
        { title: 'No link', url: null },
        { title: 'Has link', url: 'https://a' },
      ],
    })
    const list = blocks.find((b) => b.id === 'bonus-list') as { content: string }
    expect(list.content).toContain('href="https://a"')
    expect(list.content).not.toContain('No link')
  })

  it('includes a "sprawdź skrzynkę" note block', () => {
    const blocks = buildBonusEmailBlocks(INPUT)
    const note = blocks.find((b) => b.id === 'bonus-inbox-note') as { content: string }
    expect(note.content.toLowerCase()).toContain('skrzynkę')
  })

  it('escapes HTML in bonus titles to avoid markup injection', () => {
    const blocks = buildBonusEmailBlocks({
      campaignDisplayName: 'X',
      bonuses: [{ title: '<script>alert(1)</script>', url: 'https://a' }],
    })
    const list = blocks.find((b) => b.id === 'bonus-list') as { content: string }
    expect(list.content).not.toContain('<script>')
    expect(list.content).toContain('&lt;script&gt;')
  })
})

describe('buildBonusEmail (rendered HTML)', () => {
  it('renders subject + HTML containing the bonus links', async () => {
    const { subject, html } = await buildBonusEmail(INPUT)
    expect(subject).toContain('Kacper Launch')
    expect(html).toContain('https://drive.example.com/notion')
    expect(html).toContain('Zrób kopię')
  })
})
