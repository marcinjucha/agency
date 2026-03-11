'use client'

import { Input } from '@agency/ui'
import { Label } from '@agency/ui'
import { Textarea } from '@agency/ui'
import type { Block, HeaderBlock, TextBlock, CtaBlock, DividerBlock, FooterBlock } from '../types'

interface BlockEditorProps {
  block: Block
  onChange: (updated: Block) => void
}

export function BlockEditor({ block, onChange }: BlockEditorProps) {
  switch (block.type) {
    case 'header':
      return <HeaderBlockEditor block={block} onChange={onChange} />
    case 'text':
      return <TextBlockEditor block={block} onChange={onChange} />
    case 'cta':
      return <CtaBlockEditor block={block} onChange={onChange} />
    case 'divider':
      return <DividerBlockEditor block={block} onChange={onChange} />
    case 'footer':
      return <FooterBlockEditor block={block} onChange={onChange} />
  }
}

// --- Sub-editors ---

interface HeaderBlockEditorProps {
  block: HeaderBlock
  onChange: (updated: Block) => void
}

function HeaderBlockEditor({ block, onChange }: HeaderBlockEditorProps) {
  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="header-company-name">Nazwa firmy</Label>
        <Input
          id="header-company-name"
          value={block.companyName}
          onChange={(e) => onChange({ ...block, companyName: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="header-bg-color">Kolor tła</Label>
        <input
          id="header-bg-color"
          type="color"
          value={block.backgroundColor}
          onChange={(e) => onChange({ ...block, backgroundColor: e.target.value })}
          className="h-9 w-full cursor-pointer rounded-md border border-input px-1 py-1"
        />
      </div>
      <div>
        <Label htmlFor="header-text-color">Kolor tekstu</Label>
        <input
          id="header-text-color"
          type="color"
          value={block.textColor}
          onChange={(e) => onChange({ ...block, textColor: e.target.value })}
          className="h-9 w-full cursor-pointer rounded-md border border-input px-1 py-1"
        />
      </div>
    </div>
  )
}

interface TextBlockEditorProps {
  block: TextBlock
  onChange: (updated: Block) => void
}

function TextBlockEditor({ block, onChange }: TextBlockEditorProps) {
  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="text-content">Treść</Label>
        <Textarea
          id="text-content"
          rows={6}
          value={block.content}
          onChange={(e) => onChange({ ...block, content: e.target.value })}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Dostępne zmienne: <code>{'{{clientName}}'}</code>, <code>{'{{surveyTitle}}'}</code>,{' '}
          <code>{'{{companyName}}'}</code>
        </p>
      </div>
    </div>
  )
}

interface CtaBlockEditorProps {
  block: CtaBlock
  onChange: (updated: Block) => void
}

function CtaBlockEditor({ block, onChange }: CtaBlockEditorProps) {
  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="cta-label">Tekst przycisku</Label>
        <Input
          id="cta-label"
          value={block.label}
          onChange={(e) => onChange({ ...block, label: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="cta-url">URL</Label>
        <Input
          id="cta-url"
          type="url"
          value={block.url}
          onChange={(e) => onChange({ ...block, url: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="cta-bg-color">Kolor tła</Label>
        <input
          id="cta-bg-color"
          type="color"
          value={block.backgroundColor}
          onChange={(e) => onChange({ ...block, backgroundColor: e.target.value })}
          className="h-9 w-full cursor-pointer rounded-md border border-input px-1 py-1"
        />
      </div>
      <div>
        <Label htmlFor="cta-text-color">Kolor tekstu</Label>
        <input
          id="cta-text-color"
          type="color"
          value={block.textColor}
          onChange={(e) => onChange({ ...block, textColor: e.target.value })}
          className="h-9 w-full cursor-pointer rounded-md border border-input px-1 py-1"
        />
      </div>
    </div>
  )
}

interface DividerBlockEditorProps {
  block: DividerBlock
  onChange: (updated: Block) => void
}

function DividerBlockEditor({ block, onChange }: DividerBlockEditorProps) {
  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="divider-color">Kolor linii</Label>
        <input
          id="divider-color"
          type="color"
          value={block.color}
          onChange={(e) => onChange({ ...block, color: e.target.value })}
          className="h-9 w-full cursor-pointer rounded-md border border-input px-1 py-1"
        />
      </div>
    </div>
  )
}

interface FooterBlockEditorProps {
  block: FooterBlock
  onChange: (updated: Block) => void
}

function FooterBlockEditor({ block, onChange }: FooterBlockEditorProps) {
  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="footer-text">Tekst stopki</Label>
        <Textarea
          id="footer-text"
          rows={3}
          value={block.text}
          onChange={(e) => onChange({ ...block, text: e.target.value })}
        />
      </div>
    </div>
  )
}
