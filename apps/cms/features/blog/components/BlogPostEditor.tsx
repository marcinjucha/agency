'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Textarea,
} from '@agency/ui'
import { createMediaProxyEditor } from '@/lib/utils/media-proxy'
import { format } from 'date-fns'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'
import { blogPostSchema, type BlogPostFormData } from '../validation'
import { createBlogPost, updateBlogPost, deleteBlogPost } from '../actions'
import {
  generateHtmlFromContent,
  calculateReadingTime,
  generateSlug,
} from '../utils'
import { blogKeys } from '../queries'
import { getPostStatus, type BlogPostStatus, type SaveState } from '../types'
import type { BlogPost, TiptapContent } from '../types'
import { TiptapEditor } from './TiptapEditor'
import { CategoryCombobox } from './CategoryCombobox'
import { getKeywordPool } from '@/features/site-settings/queries'
import { siteSettingsKeys } from '@/features/site-settings/types'
import { BlogEditorTopBar } from './BlogEditorTopBar'
import { CoverImageUpload } from './CoverImageUpload'
import { BlogSeoCard } from './BlogSeoCard'
import { BlogStatusCard } from './BlogStatusCard'
import { DeletePostDialog } from './DeletePostDialog'

// --- Types ---

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
  const [coverModalOpen, setCoverModalOpen] = useState(false)

  const coverEditorProxy = createMediaProxyEditor((url) => {
    setValue('cover_image_url', url)
    setCoverPreview(url)
  })

  const slugManuallyEdited = useRef(false)
  const lastAutoSlug = useRef(blogPost ? blogPost.slug : '')

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
  const watchPublishedAt = watch('published_at')
  const currentStatus: BlogPostStatus = getPostStatus(watchIsPublished, watchPublishedAt ?? null)

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

  useEffect(() => {
    if (slugManuallyEdited.current) return
    const generated = generateSlug(watchTitle)
    lastAutoSlug.current = generated
    setValue('slug', generated)
  }, [watchTitle, setValue])

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

  function removeCoverImage() {
    setValue('cover_image_url', '')
    setCoverPreview(null)
  }

  return (
    <div className="flex flex-col min-h-screen bg-muted/30">
      <BlogEditorTopBar
        isEditing={isEditing}
        currentStatus={currentStatus}
        saveState={saveState}
        errorMessage={errorMessage}
        watchPublishedAt={watchPublishedAt}
        onSaveDraft={handleSaveDraft}
        onSave={handleSubmit((data) => onSave(data))}
        onSchedulePublish={handleSchedulePublish}
        onPublishNow={handlePublishNow}
      />

      <div className="w-full flex-1 px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-[1400px]">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_420px]">
            {/* LEFT COLUMN — Title + Slug + Editor */}
            <div className="flex flex-col gap-6 max-w-[700px]">
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
                  <CardTitle className="text-base font-semibold">
                    {messages.blog.settingsTitle}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Category */}
                  <div className="space-y-1.5">
                    <Label htmlFor="blog-category" className="text-sm font-medium">
                      {messages.blog.categoryLabel}
                    </Label>
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
                  <CoverImageUpload
                    preview={coverPreview}
                    modalOpen={coverModalOpen}
                    onOpenModal={() => setCoverModalOpen(true)}
                    onCloseModal={() => setCoverModalOpen(false)}
                    onRemove={removeCoverImage}
                    coverEditorProxy={coverEditorProxy}
                  />

                  {/* Excerpt */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="excerpt" className="text-sm font-medium">
                        {messages.blog.excerptLabel}
                      </Label>
                      <span className="text-xs text-muted-foreground">
                        {watchExcerpt?.length ?? 0}/300
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

              <BlogSeoCard
                register={register}
                control={control}
                errors={errors}
                watchSeoDescription={watchSeoDescription}
                keywordPool={keywordPool}
                isPoolLoading={isPoolLoading}
              />

              <BlogStatusCard
                currentStatus={currentStatus}
                scheduledDate={scheduledDate}
                scheduledTime={scheduledTime}
                watchPublishedAt={watchPublishedAt}
                readingTime={readingTime}
                blogPost={blogPost}
                onDateSelect={handleDateSelect}
                onTimeChange={handleTimeChange}
                onClearSchedule={clearSchedule}
                onCopyPreviewLink={() => {
                  const url = `${process.env.NEXT_PUBLIC_WEBSITE_URL || ''}/blog/preview/${blogPost?.preview_token}`
                  navigator.clipboard.writeText(url)
                }}
              />

              {isEditing && (
                <DeletePostDialog
                  postTitle={blogPost.title}
                  deleteState={deleteState}
                  onDelete={handleDelete}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
