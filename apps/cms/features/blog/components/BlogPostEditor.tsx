'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Textarea,
  Badge,
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@agency/ui'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'
import { blogPostSchema, type BlogPostFormData } from '../validation'
import { createBlogPost, updateBlogPost, deleteBlogPost } from '../actions'
import { generateHtmlFromContent, calculateReadingTime, generateSlug, uploadImageToS3 } from '../utils'
import { blogKeys } from '../queries'
import type { BlogPost, TiptapContent } from '../types'
import { TiptapEditor } from './TiptapEditor'
import { CategoryCombobox } from './CategoryCombobox'

// --- Types ---

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

interface BlogPostEditorProps {
  blogPost?: BlogPost
  onSuccess?: () => void
}

// --- Helpers ---

const EMPTY_CONTENT: TiptapContent = { type: 'doc', content: [] }

function estimateReadingTime(content: TiptapContent): number {
  const text = extractText(content)
  const wordCount = text.split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(wordCount / 200))
}

function extractText(node: TiptapContent | TiptapContent['content'][number]): string {
  if ('text' in node && node.text) return node.text
  if ('content' in node && Array.isArray(node.content)) {
    return node.content.map(extractText).join(' ')
  }
  return ''
}

function parseKeywords(input: string): string[] {
  return input
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean)
}

function formatKeywords(keywords: string[] | undefined): string {
  return keywords?.join(', ') ?? ''
}

// --- Component ---

export function BlogPostEditor({ blogPost, onSuccess }: BlogPostEditorProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const isEditing = !!blogPost

  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [deleteState, setDeleteState] = useState<'idle' | 'deleting'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(blogPost?.cover_image_url ?? null)
  const [isUploading, setIsUploading] = useState(false)

  // Track whether the slug was manually edited by the user
  const slugManuallyEdited = useRef(false)
  const lastAutoSlug = useRef(blogPost ? blogPost.slug : '')

  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BlogPostFormData>({
    resolver: zodResolver(blogPostSchema),
    defaultValues: {
      title: blogPost?.title ?? '',
      slug: blogPost?.slug ?? '',
      excerpt: blogPost?.excerpt ?? '',
      content: blogPost?.content ?? EMPTY_CONTENT,
      cover_image_url: blogPost?.cover_image_url ?? '',
      category: blogPost?.category ?? '',
      author_name: blogPost?.author_name ?? '',
      seo_metadata: {
        title: blogPost?.seo_metadata?.title ?? '',
        description: blogPost?.seo_metadata?.description ?? '',
        ogImage: blogPost?.seo_metadata?.ogImage ?? '',
        keywords: blogPost?.seo_metadata?.keywords ?? [],
      },
      is_published: blogPost?.is_published ?? false,
    },
  })

  const watchTitle = watch('title')
  const watchSlug = watch('slug')
  const watchContent = watch('content')
  const watchExcerpt = watch('excerpt')
  const watchSeoDescription = watch('seo_metadata.description')
  const watchIsPublished = watch('is_published')
  const watchCoverImageUrl = watch('cover_image_url')

  // Auto-generate slug from title
  useEffect(() => {
    if (slugManuallyEdited.current) return
    const generated = generateSlug(watchTitle)
    lastAutoSlug.current = generated
    setValue('slug', generated)
  }, [watchTitle, setValue])

  // Detect manual slug editing
  const handleSlugChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value
      if (val !== lastAutoSlug.current) {
        slugManuallyEdited.current = true
      }
      setValue('slug', val)
    },
    [setValue]
  )

  const readingTime = estimateReadingTime(watchContent as TiptapContent)

  // --- Save ---

  async function onSave(data: BlogPostFormData, publishOverride?: boolean) {
    setSaveState('saving')
    setErrorMessage(null)

    const html_body = generateHtmlFromContent(data.content as TiptapContent)
    const estimated_reading_time = calculateReadingTime(html_body)

    const payload = {
      ...(publishOverride !== undefined ? { ...data, is_published: publishOverride } : data),
      // Stringify content to preserve attrs (React Server Action serialization strips them)
      content: JSON.stringify(data.content),
      html_body,
      estimated_reading_time,
    }

    const result = isEditing
      ? await updateBlogPost(blogPost.id, payload)
      : await createBlogPost(payload)

    if (result.success) {
      setSaveState('saved')
      if (publishOverride !== undefined) setValue('is_published', publishOverride)
      queryClient.invalidateQueries({ queryKey: blogKeys.all })
      setTimeout(() => setSaveState('idle'), 2500)
      onSuccess?.()

      if (!isEditing && result.data) {
        router.push(routes.admin.blogPost(result.data.id))
      }
    } else {
      setSaveState('error')
      setErrorMessage(result.error ?? messages.blog.saveFailed)
      setTimeout(() => setSaveState('idle'), 4000)
    }
  }

  function handleSaveDraft() {
    handleSubmit((data) => onSave(data, false))()
  }

  function handlePublish() {
    handleSubmit((data) => onSave(data, true))()
  }

  function handleUnpublish() {
    handleSubmit((data) => onSave(data, false))()
  }

  // --- Delete ---

  async function handleDelete() {
    if (!blogPost) return
    setDeleteState('deleting')
    const result = await deleteBlogPost(blogPost.id)
    if (result.success) {
      queryClient.invalidateQueries({ queryKey: blogKeys.all })
      router.push(routes.admin.blog)
    } else {
      setDeleteState('idle')
      setErrorMessage(result.error ?? messages.blog.deleteFailed)
    }
  }

  // --- Cover image upload ---

  async function handleCoverUpload(file: File) {
    setIsUploading(true)
    setErrorMessage(null)

    try {
      const fileUrl = await uploadImageToS3(file)
      setValue('cover_image_url', fileUrl)
      setCoverPreview(fileUrl)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : messages.blog.uploadError)
    } finally {
      setIsUploading(false)
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleCoverUpload(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) handleCoverUpload(file)
  }

  function removeCoverImage() {
    setValue('cover_image_url', '')
    setCoverPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // --- Save button labels ---

  const saveLabel: Record<SaveState, string> = {
    idle: isEditing ? messages.common.save : messages.blog.saveDraft,
    saving: messages.common.saving,
    saved: messages.common.saved,
    error: messages.common.saveError,
  }

  return (
    <div className="flex flex-col min-h-screen bg-muted/30">
      {/* ---- TOP BAR ---- */}
      <div className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(routes.admin.blog)}
              className="gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <span aria-hidden="true">&larr;</span>
              Blog
            </Button>
            <h1 className="text-lg font-semibold tracking-tight">
              {isEditing ? messages.blog.editPost : messages.blog.newPost}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {isEditing && watchIsPublished && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleUnpublish}
                disabled={saveState === 'saving'}
              >
                {messages.common.unpublish}
              </Button>
            )}

            {watchIsPublished ? (
              <Button
                size="sm"
                onClick={handleSubmit((data) => onSave(data))}
                disabled={saveState === 'saving'}
              >
                {saveLabel[saveState]}
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveDraft}
                  disabled={saveState === 'saving'}
                >
                  {saveLabel[saveState]}
                </Button>
                <Button
                  size="sm"
                  onClick={handlePublish}
                  disabled={saveState === 'saving'}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {messages.common.publish}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Error banner */}
      {errorMessage && (
        <div className="mx-auto w-full max-w-7xl px-4 pt-3 sm:px-6">
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        </div>
      )}

      {/* ---- MAIN CONTENT ---- */}
      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
          {/* LEFT COLUMN — Title + Slug + Editor */}
          <div className="flex flex-col gap-6">
            {/* Title */}
            <div>
              <Input
                {...register('title')}
                placeholder={messages.blog.titlePlaceholder}
                className="border-none bg-transparent px-0 text-3xl font-bold tracking-tight placeholder:text-muted-foreground/40 focus-visible:ring-0 focus-visible:ring-offset-0"
                aria-label={messages.blog.titlePlaceholder}
              />
              {errors.title && (
                <p className="mt-1 text-sm text-destructive">{errors.title.message}</p>
              )}
            </div>

            {/* Slug */}
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-sm text-muted-foreground">/blog/</span>
              <Input
                value={watchSlug}
                onChange={handleSlugChange}
                placeholder={messages.blog.slugPlaceholder}
                className="h-8 text-sm text-muted-foreground"
                aria-label={messages.blog.slugPlaceholder}
              />
              {errors.slug && (
                <p className="shrink-0 text-sm text-destructive">{errors.slug.message}</p>
              )}
            </div>

            {/* WYSIWYG Editor */}
            <Controller
              name="content"
              control={control}
              render={({ field }) => (
                <TiptapEditor
                  content={field.value as TiptapContent}
                  onChange={field.onChange}
                  placeholder={messages.blog.contentPlaceholder}
                />
              )}
            />
          </div>

          {/* RIGHT COLUMN — Sidebar cards */}
          <div className="flex flex-col gap-6">
            {/* Settings card */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">{messages.blog.settingsTitle}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Category */}
                <div className="space-y-1.5">
                  <Label htmlFor="blog-category" className="text-xs">{messages.blog.categoryLabel}</Label>
                  <Controller
                    name="category"
                    control={control}
                    render={({ field }) => (
                      <CategoryCombobox
                        id="blog-category"
                        value={field.value ?? ''}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </div>

                {/* Author */}
                <div className="space-y-1.5">
                  <Label htmlFor="author_name" className="text-xs">
                    {messages.blog.authorLabel}
                  </Label>
                  <Input
                    id="author_name"
                    {...register('author_name')}
                    placeholder={messages.blog.authorPlaceholder}
                    className="h-8 text-sm"
                  />
                </div>

                {/* Cover image */}
                <div className="space-y-1.5">
                  <Label className="text-xs">{messages.blog.coverImageLabel}</Label>

                  {coverPreview ? (
                    <div className="group relative overflow-hidden rounded-lg">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={coverPreview}
                        alt={messages.blog.coverImagePreviewAlt}
                        className="aspect-video w-full rounded-lg object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="bg-background/90 text-xs"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          {messages.common.change}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="bg-background/90 text-xs text-destructive"
                          onClick={removeCoverImage}
                        >
                          {messages.common.delete}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/40 px-4 py-8 transition-colors hover:border-primary/40 hover:bg-muted/60"
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleDrop}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click()
                      }}
                      aria-label={messages.blog.dragOrClickAria}
                    >
                      <svg
                        className="h-8 w-8 text-muted-foreground/50"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
                        />
                      </svg>
                      <p className="text-xs text-muted-foreground">
                        {isUploading ? messages.blog.uploading : messages.blog.dragOrClick}
                      </p>
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </div>

                {/* Excerpt */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="excerpt" className="text-xs">
                      {messages.blog.excerptLabel}
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      {(watchExcerpt?.length ?? 0)}/300
                    </span>
                  </div>
                  <Textarea
                    id="excerpt"
                    {...register('excerpt')}
                    placeholder={messages.blog.excerptPlaceholder}
                    className="min-h-[80px] resize-none text-sm"
                    maxLength={300}
                  />
                  {errors.excerpt && (
                    <p className="text-xs text-destructive">{errors.excerpt.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* SEO card */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">{messages.blog.seoTitle}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="seo-title" className="text-xs">
                    {messages.blog.seoTitleLabel}
                  </Label>
                  <Input
                    id="seo-title"
                    {...register('seo_metadata.title')}
                    placeholder={messages.blog.seoTitlePlaceholder}
                    className="h-8 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="seo-description" className="text-xs">
                      {messages.blog.seoDescriptionLabel}
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      {(watchSeoDescription?.length ?? 0)}/160
                    </span>
                  </div>
                  <Textarea
                    id="seo-description"
                    {...register('seo_metadata.description')}
                    placeholder={messages.blog.seoDescriptionPlaceholder}
                    className="min-h-[60px] resize-none text-sm"
                    maxLength={160}
                  />
                  {errors.seo_metadata?.description && (
                    <p className="text-xs text-destructive">
                      {errors.seo_metadata.description.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="seo-og-image" className="text-xs">
                    OG Image URL
                  </Label>
                  <Input
                    id="seo-og-image"
                    {...register('seo_metadata.ogImage')}
                    placeholder="https://..."
                    className="h-8 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="seo-keywords" className="text-xs">
                    {messages.blog.seoKeywordsLabel}
                  </Label>
                  <Controller
                    name="seo_metadata.keywords"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="seo-keywords"
                        value={formatKeywords(field.value)}
                        onChange={(e) => field.onChange(parseKeywords(e.target.value))}
                        placeholder={messages.blog.seoKeywordsPlaceholder}
                        className="h-8 text-sm"
                      />
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Status card */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">{messages.blog.statusTitle}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{messages.blog.statusTitle}</span>
                  <Badge variant={watchIsPublished ? 'default' : 'secondary'}>
                    {watchIsPublished ? messages.common.published : messages.common.draft}
                  </Badge>
                </div>

                {blogPost?.published_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{messages.blog.publishDate}</span>
                    <span className="text-xs">
                      {new Date(blogPost.published_at).toLocaleDateString('pl-PL', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{messages.blog.readingTime}</span>
                  <span className="text-xs">{readingTime} min</span>
                </div>

                {blogPost?.preview_token && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{messages.blog.previewLink}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 text-xs text-primary"
                      onClick={() => {
                        const url = `${process.env.NEXT_PUBLIC_WEBSITE_URL || ''}/blog/preview/${blogPost.preview_token}`
                        navigator.clipboard.writeText(url)
                      }}
                    >
                      {messages.common.copyLink}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Delete — edit mode only */}
            {isEditing && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive"
                    disabled={deleteState === 'deleting'}
                  >
                    {deleteState === 'deleting' ? messages.blog.deleting : messages.blog.deletePost}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{messages.blog.deleteConfirmTitle}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {messages.blog.deleteConfirmDescription(blogPost.title)}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{messages.common.cancel}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {messages.common.delete}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
