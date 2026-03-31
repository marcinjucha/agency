'use client'

import { useRef } from 'react'
import { Input } from '@agency/ui'
import { Label } from '@agency/ui'
import { Textarea } from '@agency/ui'
import { VariableInserter } from './VariableInserter'
import type { Block, HeaderBlock, TextBlock, CtaBlock, DividerBlock, FooterBlock } from '../types'
import type { TriggerVariable } from '@/lib/trigger-schemas'

interface BlockEditorProps {
  block: Block
  onChange: (updated: Block) => void
  variables?: TriggerVariable[]
}

export function BlockEditor({ block, onChange, variables = [] }: BlockEditorProps) {
  switch (block.type) {
    case 'header':
      return <HeaderBlockEditor block={block} onChange={onChange} variables={variables} />
    case 'text':
      return <TextBlockEditor block={block} onChange={onChange} variables={variables} />
    case 'cta':
      return <CtaBlockEditor block={block} onChange={onChange} variables={variables} />
    case 'divider':
      return <DividerBlockEditor block={block} onChange={onChange} />
    case 'footer':
      return <FooterBlockEditor block={block} onChange={onChange} variables={variables} />
  }
}

// --- Sub-editors ---

interface SubEditorProps<T extends Block> {
  block: T
  onChange: (updated: Block) => void
  variables: TriggerVariable[]
}

function HeaderBlockEditor({ block, onChange, variables }: SubEditorProps<HeaderBlock>) {
  const companyNameRef = useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center justify-between">
          <Label htmlFor="header-company-name">Nazwa firmy</Label>
          <VariableInserter
            variables={variables}
            inputRef={companyNameRef}
            onChange={(val) => onChange({ ...block, companyName: val })}
            currentValue={block.companyName}
          />
        </div>
        <Input
          ref={companyNameRef}
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

function TextBlockEditor({ block, onChange, variables }: SubEditorProps<TextBlock>) {
  const contentRef = useRef<HTMLTextAreaElement>(null)

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center justify-between">
          <Label htmlFor="text-content">Treść</Label>
          <VariableInserter
            variables={variables}
            inputRef={contentRef}
            onChange={(val) => onChange({ ...block, content: val })}
            currentValue={block.content}
          />
        </div>
        <Textarea
          ref={contentRef}
          id="text-content"
          rows={6}
          value={block.content}
          onChange={(e) => onChange({ ...block, content: e.target.value })}
        />
      </div>
    </div>
  )
}

function CtaBlockEditor({ block, onChange, variables }: SubEditorProps<CtaBlock>) {
  const labelRef = useRef<HTMLInputElement>(null)
  const urlRef = useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center justify-between">
          <Label htmlFor="cta-label">Tekst przycisku</Label>
          <VariableInserter
            variables={variables}
            inputRef={labelRef}
            onChange={(val) => onChange({ ...block, label: val })}
            currentValue={block.label}
          />
        </div>
        <Input
          ref={labelRef}
          id="cta-label"
          value={block.label}
          onChange={(e) => onChange({ ...block, label: e.target.value })}
        />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <Label htmlFor="cta-url">URL</Label>
          <VariableInserter
            variables={variables}
            inputRef={urlRef}
            onChange={(val) => onChange({ ...block, url: val })}
            currentValue={block.url}
          />
        </div>
        <Input
          ref={urlRef}
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

function FooterBlockEditor({ block, onChange, variables }: SubEditorProps<FooterBlock>) {
  const textRef = useRef<HTMLTextAreaElement>(null)

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center justify-between">
          <Label htmlFor="footer-text">Tekst stopki</Label>
          <VariableInserter
            variables={variables}
            inputRef={textRef}
            onChange={(val) => onChange({ ...block, text: val })}
            currentValue={block.text}
          />
        </div>
        <Textarea
          ref={textRef}
          id="footer-text"
          rows={3}
          value={block.text}
          onChange={(e) => onChange({ ...block, text: e.target.value })}
        />
      </div>
    </div>
  )
}
