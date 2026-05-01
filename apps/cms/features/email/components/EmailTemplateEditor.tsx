

import { useState, useRef, useEffect } from 'react'
import { Button } from '@agency/ui'
import { Input } from '@agency/ui'
import { Label } from '@agency/ui'
import { BlockList } from './BlockList'
import { EmailPreview } from './EmailPreview'
import { VariableInserter } from './VariableInserter'
import { DEFAULT_BLOCKS } from '../constants'
import type { Block, EmailTemplate } from '../types'
import { updateEmailTemplateFn, resetEmailTemplateToDefaultFn } from '../server'
import { messages } from '@/lib/messages'
import { getTriggerVariables } from '@/lib/trigger-schemas'

interface EmailTemplateEditorProps {
  templateType: string
  initialTemplate: EmailTemplate | null
}

export function EmailTemplateEditor({ templateType, initialTemplate }: EmailTemplateEditorProps) {
  const [subject, setSubject] = useState(initialTemplate?.subject ?? '')
  const [blocks, setBlocks] = useState<Block[]>(initialTemplate?.blocks ?? DEFAULT_BLOCKS)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Sync state when initialTemplate loads asynchronously (prefetchQuery is non-blocking)
  useEffect(() => {
    if (initialTemplate) {
      setSubject(initialTemplate.subject ?? '')
      setBlocks(initialTemplate.blocks ?? DEFAULT_BLOCKS)
    }
  }, [initialTemplate])

  const variables = getTriggerVariables(templateType)
  const subjectRef = useRef<HTMLInputElement>(null)

  async function resetToDefaults() {
    setSaveState('saving')
    setErrorMessage(null)
    try {
      const result = await resetEmailTemplateToDefaultFn({ data: { type: templateType } })
      if (result.success) {
        setBlocks(DEFAULT_BLOCKS)
        setSubject('Dziękujemy za wypełnienie formularza - {{surveyTitle}}')
        setSaveState('saved')
      } else {
        setSaveState('error')
        setErrorMessage(result.error ?? null)
      }
    } catch (err) {
      setSaveState('error')
      setErrorMessage(err instanceof Error ? err.message : messages.common.unknownError)
    } finally {
      setTimeout(() => setSaveState('idle'), 2500)
    }
  }

  async function handleSave() {
    setSaveState('saving')
    setErrorMessage(null)
    try {
      const result = await updateEmailTemplateFn({ data: { type: templateType, data: { subject, blocks } } })
      setSaveState(result.success ? 'saved' : 'error')
      if (!result.success) setErrorMessage(result.error ?? null)
    } catch (err) {
      setSaveState('error')
      setErrorMessage(err instanceof Error ? err.message : messages.common.unknownError)
    } finally {
      // Reset to idle after 2.5s so button label returns to normal
      setTimeout(() => setSaveState('idle'), 2500)
    }
  }

  const saveLabel = {
    idle: messages.common.save,
    saving: messages.common.saving,
    saved: messages.common.saved,
    error: messages.common.saveError,
  }[saveState]

  return (
    <div className="mx-auto max-w-[1400px] flex flex-col gap-6">
      {/* Subject */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="email-subject">{messages.email.subjectLabel}</Label>
          <VariableInserter
            variables={variables}
            inputRef={subjectRef}
            onChange={setSubject}
            currentValue={subject}
          />
        </div>
        <Input
          ref={subjectRef}
          id="email-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder={messages.email.subjectPlaceholder}
        />
      </div>

      {/* Two-column editor + preview */}
      <div className="grid grid-cols-[2fr_3fr] gap-6 min-h-[600px]">
        {/* Left: block list (40% ≈ 2/5) */}
        <div className="overflow-y-auto">
          <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide mb-3">
            {messages.email.blocksLabel}
          </p>
          <BlockList blocks={blocks} onChange={setBlocks} variables={variables} />
        </div>

        {/* Right: live preview (60% ≈ 3/5) */}
        <div className="flex flex-col">
          <EmailPreview blocks={blocks} className="min-h-[600px]" />
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-3 pt-2 border-t">
        <Button onClick={handleSave} disabled={saveState === 'saving'}>
          {saveLabel}
        </Button>
        <Button variant="outline" onClick={resetToDefaults} className="text-destructive border-destructive/40 hover:bg-destructive/5">
          {messages.email.restoreDefaults}
        </Button>
        {saveState === 'error' && (
          <p className="text-sm text-destructive">
            {messages.email.templateSaveFailed}
            {errorMessage && <span className="block mt-1 text-xs opacity-75">{errorMessage}</span>}
          </p>
        )}
      </div>
    </div>
  )
}
