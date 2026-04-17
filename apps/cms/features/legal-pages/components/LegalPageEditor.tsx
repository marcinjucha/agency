import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import {
  Button,
  Input,
  Label,
  Badge,
  Checkbox,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@agency/ui'
import { Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'
import { legalPageSchema, type LegalPageFormData } from '../validation'
import { legalPageKeys } from '../queries'
import { deleteLegalPageFn } from '../server'
import type { LegalPage } from '../types'
import type { TiptapContent } from '../../editor/types'
import { TiptapEditor } from '../../editor/components/TiptapEditor'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'
type DeleteState = 'idle' | 'deleting' | 'error'

interface LegalPageEditorProps {
  legalPage: LegalPage
  updateFn: (id: string, data: LegalPageFormData) => Promise<{ success: boolean; error?: string }>
}

const EMPTY_CONTENT: TiptapContent = { type: 'doc', content: [] }

export function LegalPageEditor({ legalPage, updateFn }: LegalPageEditorProps) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [saveError, setSaveError] = useState<string>('')
  const [deleteState, setDeleteState] = useState<DeleteState>('idle')
  const [deleteError, setDeleteError] = useState<string>('')

  const { control, handleSubmit, setValue, watch } = useForm<LegalPageFormData>({
    resolver: zodResolver(legalPageSchema),
    mode: 'onChange',
    defaultValues: {
      slug: legalPage.slug,
      title: legalPage.title,
      content: legalPage.blocks || EMPTY_CONTENT,
      is_published: legalPage.is_published,
    },
  })

  const isPublished = watch('is_published')
  const slugValue = watch('slug')

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

  const onDelete = async () => {
    setDeleteState('deleting')
    setDeleteError('')

    let result: { success: boolean; error?: string }
    try {
      result = await deleteLegalPageFn({ data: { id: legalPage.id } })
    } catch (e) {
      result = {
        success: false,
        error: e instanceof Error ? e.message : messages.common.unknownError,
      }
    }

    if (result.success) {
      queryClient.invalidateQueries({ queryKey: legalPageKeys.all })
      navigate({ to: routes.admin.legalPages })
      return
    }

    setDeleteState('error')
    setDeleteError(result.error || messages.legalPages.deleteError)
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to={routes.admin.legalPages}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label={messages.common.back}
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-semibold text-foreground truncate">
            {messages.legalPages.editTitle}
          </h1>
          <Badge variant={isPublished ? 'default' : 'secondary'}>
            {isPublished ? messages.legalPages.published : messages.legalPages.draft}
          </Badge>
        </div>

        <div className="flex items-center gap-3">
          {saveState === 'error' && (
            <p className="text-sm text-destructive" role="alert">{saveError}</p>
          )}
          {deleteState === 'error' && (
            <p className="text-sm text-destructive" role="alert">{deleteError}</p>
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive"
                disabled={deleteState === 'deleting' || saveState === 'saving'}
              >
                <Trash2 size={14} className="mr-1.5" aria-hidden="true" />
                {deleteState === 'deleting'
                  ? messages.common.saving
                  : messages.legalPages.deleteButton}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{messages.legalPages.deleteButton}</AlertDialogTitle>
                <AlertDialogDescription>
                  {messages.legalPages.deleteConfirm}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{messages.common.cancel}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {messages.common.delete}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button
            onClick={handleSubmit(onSubmit)}
            disabled={saveState === 'saving' || deleteState === 'deleting'}
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

      {/* Slug */}
      <div className="space-y-2">
        <Label htmlFor="slug">{messages.legalPages.slugLabel}</Label>
        <Controller
          name="slug"
          control={control}
          render={({ field, fieldState }) => (
            <>
              <Input
                id="slug"
                {...field}
                aria-invalid={!!fieldState.error}
                aria-describedby={fieldState.error ? 'slug-error' : 'slug-help'}
                placeholder="polityka-prywatnosci"
              />
              {fieldState.error ? (
                <p id="slug-error" role="alert" className="text-sm text-destructive">
                  {fieldState.error.message}
                </p>
              ) : (
                <p id="slug-help" className="text-xs text-muted-foreground">
                  {messages.legalPages.slugHelp}
                  {slugValue && (
                    <>
                      {' '}
                      <span className="text-foreground/80">/{slugValue}</span>
                    </>
                  )}
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
