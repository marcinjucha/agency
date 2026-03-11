'use client'

import { useState } from 'react'
import { Button } from '@agency/ui'
import { Input } from '@agency/ui'
import { Label } from '@agency/ui'
import { Badge } from '@agency/ui'
import { BlockList } from './BlockList'
import { EmailPreview } from './EmailPreview'
import { DEFAULT_BLOCKS, TEMPLATE_VARIABLES } from '../types'
import type { Block, EmailTemplate } from '../types'
import { updateEmailTemplate } from '../actions'

interface EmailTemplateEditorProps {
  templateType: string
  initialTemplate: EmailTemplate | null
}

export function EmailTemplateEditor({ templateType, initialTemplate }: EmailTemplateEditorProps) {
  const [subject, setSubject] = useState(initialTemplate?.subject ?? '')
  const [blocks, setBlocks] = useState<Block[]>(initialTemplate?.blocks ?? DEFAULT_BLOCKS)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const variables = TEMPLATE_VARIABLES[templateType as keyof typeof TEMPLATE_VARIABLES] ?? []

  function copyVariable(name: string) {
    navigator.clipboard.writeText(name).catch(() => {
      // Non-critical — clipboard API can be blocked in some contexts
    })
  }

  function resetToDefaults() {
    setBlocks(DEFAULT_BLOCKS)
  }

  async function handleSave() {
    setSaveState('saving')
    try {
      const result = await updateEmailTemplate(templateType, { subject, blocks })
      setSaveState(result.success ? 'saved' : 'error')
    } catch {
      setSaveState('error')
    } finally {
      // Reset to idle after 2.5s so button label returns to normal
      setTimeout(() => setSaveState('idle'), 2500)
    }
  }

  const saveLabel = {
    idle: 'Zapisz',
    saving: 'Zapisywanie…',
    saved: 'Zapisano',
    error: 'Błąd zapisu',
  }[saveState]

  return (
    <div className="flex flex-col gap-6">
      {/* Subject + variables */}
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="email-subject">Temat emaila</Label>
          <Input
            id="email-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="np. Dziękujemy za wypełnienie formularza — {{surveyTitle}}"
          />
        </div>

        {variables.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Dostępne zmienne:</span>
            {variables.map((v) => (
              <Badge
                key={v.name}
                variant="secondary"
                className="cursor-pointer select-none hover:bg-secondary/80 transition-colors"
                title={v.description}
                onClick={() => copyVariable(v.name)}
              >
                {v.name}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Two-column editor + preview */}
      <div className="grid grid-cols-[2fr_3fr] gap-6 min-h-[600px]">
        {/* Left: block list (40% ≈ 2/5) */}
        <div className="overflow-y-auto">
          <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide mb-3">
            Bloki
          </p>
          <BlockList blocks={blocks} onChange={setBlocks} />
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
          Przywróć domyślne
        </Button>
        {saveState === 'error' && (
          <p className="text-sm text-destructive">Nie udało się zapisać szablonu. Spróbuj ponownie.</p>
        )}
      </div>
    </div>
  )
}
