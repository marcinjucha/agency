'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Textarea,
  DatePicker,
  TimePicker,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
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
import { HelpCircle } from 'lucide-react'
import { format, startOfDay } from 'date-fns'
import { pl } from 'date-fns/locale'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'
import { blogPostSchema, type BlogPostFormData } from '../validation'
import { createBlogPost, updateBlogPost, deleteBlogPost } from '../actions'
import { generateHtmlFromContent, calculateReadingTime, generateSlug, uploadImageToS3 } from '../utils'
import { blogKeys } from '../queries'
import { getPostStatus, type BlogPostStatus } from '../types'
import type { BlogPost, TiptapContent } from '../types'
import { TiptapEditor } from './TiptapEditor'
import { CategoryCombobox } from './CategoryCombobox'
import { BlogStatusBadge } from './blog-status-badge'
import { KeywordSelect } from '@/features/site-settings/components/KeywordSelect'
import { getKeywordPool } from '@/features/site-settings/queries'
import { siteSettingsKeys } from '@/features/site-settings/types'

// --- Types ---

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

interface BlogPostEditorProps {
  blogPost?: BlogPost
  onSuccess?: () => void
}

// --- Helpers ---

const EMPTY_CONTENT: TiptapContent = { type: 'doc', content: [] }

// Live preview estimate from TiptapContent JSON — utils.ts calculateReadingTime works on final HTML string (used in onSave)
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

// --- Component ---

export function BlogPostEditor({ blogPost, onSuccess }: BlogPostEditorProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const isEditing = !!blogPost

  const { data: keywordPool = [], isLoading: isPoolLoading } = useQuery({
    queryKey: siteSettingsKeys.keywordPool,
    queryFn: getKeywordPool,
  })

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
      published_at: blogPost?.published_at ?? null,
    },
  })

  const watchTitle = watch('title')
  const watchSlug = watch('slug')
  const watchContent = watch('content')
  const watchExcerpt = watch('excerpt')
  const watchSeoDescription = watch('seo_metadata.description')
  const watchIsPublished = watch('is_published')
  const watchCoverImageUrl = watch('cover_image_url')
  const watchPublishedAt = watch('published_at')
  const currentStatus: BlogPostStatus = getPostStatus(watchIsPublished, watchPublishedAt ?? null)

  // Schedule picker local state
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(() => {
    if (blogPost?.published_at) {
      const d = new Date(blogPost.published_at)
      return d > new Date() ? d : undefined
    }
    return undefined
  })
  const [scheduledTime, setScheduledTime] = useState<string>(() => {
    if (blogPost?.published_at) {
      const d = new Date(blogPost.published_at)
      return d > new Date() ? format(d, 'HH:mm') : '09:00'
    }
    return '09:00'
  })

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

  function handleDateSelect(date: Date | undefined) {
    if (!date) return
    setScheduledDate(date)
    const [hours, minutes] = scheduledTime.split(':').map(Number)
    const combined = new Date(date)
    combined.setHours(hours, minutes, 0, 0)
    setValue('published_at', combined.toISOString())
  }

  function handleTimeChange(time: string) {
    setScheduledTime(time)
    if (scheduledDate) {
      const [hours, minutes] = time.split(':').map(Number)
      const combined = new Date(scheduledDate)
      combined.setHours(hours, minutes, 0, 0)
      setValue('published_at', combined.toISOString())
    }
  }

  function clearSchedule() {
    setScheduledDate(undefined)
    setScheduledTime('09:00')
    setValue('published_at', null)
    setValue('is_published', false)
  }

  function handleSchedulePublish() {
    const publishedAt = watch('published_at')
    if (!publishedAt) {
      setErrorMessage(messages.blog.scheduleRequired)
      return
    }
    if (new Date(publishedAt) <= new Date()) {
      setErrorMessage(messages.blog.scheduleMustBeFuture)
      return
    }
    handleSubmit((data) => onSave(data, true))()
  }

  function handlePublishNow() {
    setValue('published_at', new Date().toISOString())
    setScheduledDate(undefined)
    handleSubmit((data) => onSave(data, true))()
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
        <div className="flex items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => router.push(routes.admin.blog)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 w-fit"
            >
              <span aria-hidden="true">&larr;</span>
              Blog
            </button>
            <h1 className="text-2xl font-bold tracking-tight">
              {isEditing ? messages.blog.editPost : messages.blog.newPost}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Unpublish — shown for scheduled and published */}
            {isEditing && currentStatus !== 'draft' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveDraft}
                disabled={saveState === 'saving'}
              >
                {messages.common.unpublish}
              </Button>
            )}

            {currentStatus === 'published' ? (
              // Published: just Save
              <Button
                size="sm"
                onClick={handleSubmit((data) => onSave(data))}
                disabled={saveState === 'saving'}
              >
                {saveLabel[saveState]}
              </Button>
            ) : currentStatus === 'scheduled' ? (
              // Scheduled: Save + Publish Now
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSubmit((data) => onSave(data))}
                  disabled={saveState === 'saving'}
                >
                  {saveLabel[saveState]}
                </Button>
                <Button
                  size="sm"
                  onClick={handlePublishNow}
                  disabled={saveState === 'saving'}
                >
                  {messages.blog.publishNow}
                </Button>
              </>
            ) : (
              // Draft: Save Draft + Schedule (if date) + Publish Now
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveDraft}
                  disabled={saveState === 'saving'}
                >
                  {saveLabel[saveState]}
                </Button>
                {watchPublishedAt && new Date(watchPublishedAt) > new Date() && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSchedulePublish}
                    disabled={saveState === 'saving'}
                  >
                    {messages.blog.schedulePublish}
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={handlePublishNow}
                  disabled={saveState === 'saving'}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {messages.blog.publishNow}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Error banner */}
      {errorMessage && (
        <div className="w-full px-4 pt-3 sm:px-6">
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        </div>
      )}

      {/* ---- MAIN CONTENT ---- */}
      <div className="w-full flex-1 px-4 py-6 sm:px-6">
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
                className="text-sm text-muted-foreground"
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
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold">{messages.blog.settingsTitle}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Category */}
                <div className="space-y-1.5">
                  <Label htmlFor="blog-category" className="text-sm font-medium">{messages.blog.categoryLabel}</Label>
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
                  <Label htmlFor="author_name" className="text-sm font-medium">
                    {messages.blog.authorLabel}
                  </Label>
                  <Input
                    id="author_name"
                    {...register('author_name')}
                    placeholder={messages.blog.authorPlaceholder}
                    className="text-sm"
                  />
                </div>

                {/* Cover image */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">{messages.blog.coverImageLabel}</Label>

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
                    <Label htmlFor="excerpt" className="text-sm font-medium">
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
                    autoResize
                  />
                  {errors.excerpt && (
                    <p className="text-xs text-destructive">{errors.excerpt.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* SEO card */}
            <Card className="shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold">{messages.blog.seoTitle}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <TooltipProvider delayDuration={300}>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor="seo-title" className="text-sm font-medium">
                        {messages.blog.seoTitleLabel}
                      </Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            aria-label="Jeśli pusty, użyty zostanie tytuł artykułu. Zalecana długość: 50-60 znaków."
                          >
                            <HelpCircle className="h-3 w-3" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs">
                          <p>Jeśli pusty, użyty zostanie tytuł artykułu. Zalecana długość: 50-60 znaków.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="seo-title"
                      {...register('seo_metadata.title')}
                      placeholder={messages.blog.seoTitlePlaceholder}
                      className="text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Label htmlFor="seo-description" className="text-sm font-medium">
                          {messages.blog.seoDescriptionLabel}
                        </Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-foreground transition-colors"
                              aria-label="Opis wyświetlany w wynikach wyszukiwania. Maksymalnie 160 znaków."
                            >
                              <HelpCircle className="h-3 w-3" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-xs">
                            <p>Opis wyświetlany w wynikach wyszukiwania. Maksymalnie 160 znaków.</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
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
                      autoResize
                    />
                    {errors.seo_metadata?.description && (
                      <p className="text-xs text-destructive">
                        {errors.seo_metadata.description.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor="seo-og-image" className="text-sm font-medium">
                        OG Image URL
                      </Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            aria-label="Obraz wyświetlany przy udostępnianiu w mediach społecznościowych. Jeśli pusty, użyty zostanie obrazek okładkowy."
                          >
                            <HelpCircle className="h-3 w-3" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs">
                          <p>Obraz wyświetlany przy udostępnianiu w mediach społecznościowych. Jeśli pusty, użyty zostanie obrazek okładkowy.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="seo-og-image"
                      {...register('seo_metadata.ogImage')}
                      placeholder="https://..."
                      className="text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor="seo-keywords" className="text-sm font-medium">
                        {messages.blog.seoKeywordsLabel}
                      </Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            aria-label="Słowa kluczowe pomagają w pozycjonowaniu. Wybierz istniejące lub dodaj nowe."
                          >
                            <HelpCircle className="h-3 w-3" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs">
                          <p>Słowa kluczowe pomagają w pozycjonowaniu. Wybierz istniejące lub dodaj nowe.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Controller
                      name="seo_metadata.keywords"
                      control={control}
                      render={({ field }) => (
                        <KeywordSelect
                          id="seo-keywords"
                          value={field.value ?? []}
                          onChange={field.onChange}
                          pool={keywordPool}
                          isLoading={isPoolLoading}
                        />
                      )}
                    />
                  </div>
                </TooltipProvider>
              </CardContent>
            </Card>

            {/* Status card */}
            <Card className="shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold">{messages.blog.statusTitle}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{messages.blog.statusTitle}</span>
                  <BlogStatusBadge status={currentStatus} />
                </div>

                {/* Schedule date/time picker — visible for draft + scheduled, hidden for published */}
                {currentStatus !== 'published' && (
                  <div className="space-y-2">
                    <DatePicker
                      value={scheduledDate}
                      onChange={handleDateSelect}
                      disabled={(date) => date < startOfDay(new Date())}
                      placeholder={messages.blog.pickDate}
                    />

                    <div className="flex items-center gap-2">
                      <TimePicker
                        value={scheduledTime}
                        onChange={(time) => handleTimeChange(time ?? '09:00')}
                        minuteStep={5}
                      />
                      {scheduledDate && (
                        <Button variant="ghost" size="sm" onClick={clearSchedule} className="text-xs text-muted-foreground">
                          {messages.blog.removeSchedule}
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Scheduled date display for scheduled status */}
                {currentStatus === 'scheduled' && watchPublishedAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{messages.blog.scheduledFor}</span>
                    <span className="text-xs">
                      {format(new Date(watchPublishedAt), 'd MMM yyyy, HH:mm', { locale: pl })}
                    </span>
                  </div>
                )}

                {/* Published date display */}
                {currentStatus === 'published' && blogPost?.published_at && (
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
