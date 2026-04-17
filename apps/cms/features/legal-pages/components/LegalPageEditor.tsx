

import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { Button, Input, Label, Badge, Checkbox } from '@agency/ui'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'
import { legalPageSchema, type LegalPageFormData } from '../validation'
import { legalPageKeys } from '../queries'
import type { LegalPage } from '../types'
import type { TiptapContent } from '../../editor/types'
import { TiptapEditor } from '../../editor/components/TiptapEditor'
import { ArrowLeft } from 'lucide-react'
import { Link } from '@tanstack/react-router'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

interface LegalPageEditorProps {
  legalPage: LegalPage
  updateFn: (id: string, data: LegalPageFormData) => Promise<{ success: boolean; error?: string }>
}

const EMPTY_CONTENT: TiptapContent = { type: 'doc', content: [] }

export function LegalPageEditor({ legalPage, updateFn }: LegalPageEditorProps) {
  const queryClient = useQueryClient()
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [saveError, setSaveError] = useState<string>('')

  const { control, handleSubmit, setValue, watch } = useForm<LegalPageFormData>({
    resolver: zodResolver(legalPageSchema),
    defaultValues: {
      title: legalPage.title,
      content: legalPage.blocks || EMPTY_CONTENT,
      is_published: legalPage.is_published,
    },
  })

  const isPublished = watch('is_published')

  const onContentChange = (content: TiptapContent) => {
    setValue('content', content)
  }

  const onSubmit = async (data: LegalPageFormData) => {
    setSaveState('saving')
    setSaveError('')

    let result: { success: boolean; error?: string }
    try {
      result = await updateFn(legalPage.id, data)
    } catch (e) {
      result = { success: false, error: e instanceof Error ? e.message : messages.common.unknownError }
    }

    if (result.success) {
      setSaveState('saved')
      queryClient.invalidateQueries({ queryKey: legalPageKeys.all })
      queryClient.invalidateQueries({ queryKey: legalPageKeys.detail(legalPage.id) })
      setTimeout(() => setSaveState('idle'), 2000)
    } else {
      setSaveState('error')
      setSaveError(result.error || messages.legalPages.updateError)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to={routes.admin.legalPages}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-semibold text-foreground">
            {messages.legalPages.editTitle}
          </h1>
          <Badge variant={isPublished ? 'default' : 'secondary'}>
            {isPublished ? messages.legalPages.published : messages.legalPages.draft}
          </Badge>
        </div>

        <div className="flex items-center gap-3">
          {saveState === 'error' && (
            <p className="text-sm text-destructive">{saveError}</p>
          )}
          <Button
            onClick={handleSubmit(onSubmit)}
            disabled={saveState === 'saving'}
          >
            {saveState === 'saving'
              ? messages.common.saving
              : saveState === 'saved'
                ? messages.common.saved
                : messages.common.save}
          </Button>
        </div>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">{messages.validation.titleRequired.replace(' jest wymagany', '')}</Label>
        <Controller
          name="title"
          control={control}
          render={({ field, fieldState }) => (
            <>
              <Input
                id="title"
                {...field}
                aria-invalid={!!fieldState.error}
                aria-describedby={fieldState.error ? 'title-error' : undefined}
              />
              {fieldState.error && (
                <p id="title-error" role="alert" className="text-sm text-destructive">
                  {fieldState.error.message}
                </p>
              )}
            </>
          )}
        />
      </div>

      {/* Publish toggle */}
      <div className="flex items-center gap-2">
        <Controller
          name="is_published"
          control={control}
          render={({ field }) => (
            <Checkbox
              id="is_published"
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
        <Label htmlFor="is_published">{messages.legalPages.published}</Label>
      </div>

      {/* Tiptap Editor */}
      <div className="min-h-[400px]">
        <TiptapEditor
          content={legalPage.blocks || EMPTY_CONTENT}
          onChange={onContentChange}
        />
      </div>
    </div>
  )
}
