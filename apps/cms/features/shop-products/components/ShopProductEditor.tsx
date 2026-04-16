

import { useState, useRef, useCallback, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import {
  Button,
  Input,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
import { queryKeys } from '@/lib/query-keys'
import { createShopProductSchema, type CreateShopProductFormData } from '../validation'
// Mutation functions injected as props (framework-agnostic dependency injection)
// Callers (TanStack route files) pass server fns; legacy Next.js callers pass Server Actions
import { generateSlug } from '../utils'
import type { ShopProduct } from '../types'
import type { TiptapContent } from '../../editor/types'
import { generateHtmlFromContent } from '../../editor/utils'
import { ProductTiptapEditor } from './ProductTiptapEditor'
import { ProductSettingsSidebar } from './ProductSettingsSidebar'
import { ProductImageManager } from './ProductImageManager'
import { ProductSeoSidebar } from './ProductSeoSidebar'
import { MarketplacePublishPanel } from '../../shop-marketplace/components/MarketplacePublishPanel'

// --- Types ---

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

// --- Mutation prop types (same return shapes as actions.ts + server.ts) ---

type CreateFn = (data: CreateShopProductFormData) => Promise<{ success: boolean; data?: ShopProduct; error?: string }>
type UpdateFn = (id: string, data: Partial<CreateShopProductFormData>) => Promise<{ success: boolean; data?: ShopProduct; error?: string }>
type DeleteFn = (id: string) => Promise<{ success: boolean; error?: string }>

interface ShopProductEditorProps {
  product?: ShopProduct
  createFn?: CreateFn
  updateFn?: UpdateFn
  deleteFn?: DeleteFn
}

// --- Constants ---

const EMPTY_CONTENT: TiptapContent = { type: 'doc', content: [] }

// --- Component ---

export function ShopProductEditor({ product, createFn, updateFn, deleteFn }: ShopProductEditorProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEditing = !!product

  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [deleteState, setDeleteState] = useState<'idle' | 'deleting'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(product?.cover_image_url ?? null)

  // Track whether the slug was manually edited
  const slugManuallyEdited = useRef(false)
  const lastAutoSlug = useRef(product ? product.slug : '')

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateShopProductFormData, unknown, CreateShopProductFormData>({
    resolver: zodResolver(createShopProductSchema),
    defaultValues: {
      title: product?.title ?? '',
      slug: product?.slug ?? '',
      listing_type: product?.listing_type ?? 'external_link',
      display_layout: (product?.display_layout as 'gallery' | 'editorial') ?? 'gallery',
      short_description: product?.short_description ?? '',
      description: product?.description ?? EMPTY_CONTENT,
      cover_image_url: product?.cover_image_url ?? '',
      images: product?.images ?? [],
      price: product?.price ?? undefined,
      currency: product?.currency ?? 'PLN',
      external_url: product?.external_url ?? '',
      digital_file_url: product?.digital_file_url ?? '',
      digital_file_name: product?.digital_file_name ?? '',
      digital_file_size: product?.digital_file_size ?? undefined,
      category_id: product?.category_id ?? undefined,
      tags: product?.tags ?? [],
      sort_order: product?.sort_order ?? 0,
      seo_metadata: {
        title: product?.seo_metadata?.title ?? '',
        description: product?.seo_metadata?.description ?? '',
        ogImage: product?.seo_metadata?.ogImage ?? '',
        keywords: product?.seo_metadata?.keywords ?? [],
      },
      is_featured: product?.is_featured ?? false,
      is_published: product?.is_published ?? false,
    },
  })

  const watchTitle = watch('title')
  const watchSlug = watch('slug')
  const watchIsPublished = watch('is_published')
  const watchImages = watch('images') ?? []

  // Auto-generate slug from title (create mode only, not when manually edited)
  useEffect(() => {
    if (isEditing) return
    if (slugManuallyEdited.current) return
    const generated = generateSlug(watchTitle)
    lastAutoSlug.current = generated
    setValue('slug', generated)
  }, [watchTitle, setValue, isEditing])

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

  // --- Cover image management ---

  const handleCoverChange = useCallback(
    (url: string | null) => {
      setValue('cover_image_url', url ?? '')
      setCoverPreview(url)
    },
    [setValue]
  )

  // --- Images management ---

  const handleImagesChange = useCallback(
    (images: string[]) => {
      setValue('images', images)
    },
    [setValue]
  )

  const handleSetCoverFromGallery = useCallback(
    (url: string) => {
      setValue('cover_image_url', url)
      setCoverPreview(url)
    },
    [setValue]
  )

  // --- Save ---

  async function onSave(data: CreateShopProductFormData, publishOverride?: boolean) {
    setSaveState('saving')
    setErrorMessage(null)

    const html_body = data.description
      ? generateHtmlFromContent(data.description as TiptapContent)
      : null

    const payload = {
      ...(publishOverride !== undefined ? { ...data, is_published: publishOverride } : data),
      // Stringify content to preserve attrs (React Server Action serialization strips them)
      description: data.description ? JSON.stringify(data.description) : null,
      html_body,
    }

    const result = isEditing
      ? await updateFn!(product.id, payload)
      : await createFn!(payload)

    if (result.success) {
      setSaveState('saved')
      if (publishOverride !== undefined) setValue('is_published', publishOverride)
      queryClient.invalidateQueries({ queryKey: queryKeys.shopProducts.all })
      setTimeout(() => setSaveState('idle'), 2500)

      if (!isEditing && result.data) {
        navigate({ to: routes.admin.shopProduct(result.data.id) })
      }
    } else {
      setSaveState('error')
      setErrorMessage(result.error ?? messages.shop.createProductFailed)
      setTimeout(() => setSaveState('idle'), 4000)
    }
  }

  function onFormError(errors: Record<string, unknown>) {
    console.error('Form validation errors:', errors)
    setSaveState('error')
    setErrorMessage(messages.shop.formValidationError)
    setTimeout(() => setSaveState('idle'), 4000)
  }

  function handleSaveDraft() {
    handleSubmit((data) => onSave(data, false), onFormError)()
  }

  function handlePublish() {
    handleSubmit((data) => onSave(data, true), onFormError)()
  }

  function handleUnpublish() {
    handleSubmit((data) => onSave(data, false), onFormError)()
  }

  // --- Delete ---

  async function handleDelete() {
    if (!product) return
    setDeleteState('deleting')
    const result = await deleteFn!(product.id)
    if (result.success) {
      queryClient.invalidateQueries({ queryKey: queryKeys.shopProducts.all })
      navigate({ to: routes.admin.shopProducts })
    } else {
      setDeleteState('idle')
      setErrorMessage(result.error ?? messages.shop.deleteProductFailed)
    }
  }

  // --- Save button labels ---

  const saveLabel: Record<SaveState, string> = {
    idle: isEditing ? messages.common.save : messages.shop.saveDraft,
    saving: messages.shop.saving,
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
              onClick={() => navigate({ to: routes.admin.shopProducts })}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 w-fit"
            >
              <span aria-hidden="true">&larr;</span>
              {messages.shop.productsTitle}
            </button>
            <h1 className="text-2xl font-bold tracking-tight">
              {isEditing ? messages.shop.editProduct : messages.shop.newProduct}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Unpublish — shown when published */}
            {isEditing && watchIsPublished && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleUnpublish}
                disabled={saveState === 'saving'}
              >
                {messages.shop.unpublish}
              </Button>
            )}

            {watchIsPublished ? (
              // Published: just Save
              <Button
                size="sm"
                onClick={handleSubmit((data) => onSave(data), onFormError)}
                disabled={saveState === 'saving'}
              >
                {saveLabel[saveState]}
              </Button>
            ) : (
              // Draft: Save Draft + Publish
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
                  {messages.shop.publish}
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
        <div className="mx-auto max-w-[1400px]">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_420px]">
          {/* LEFT COLUMN — Title + Slug + Editor */}
          <div className="flex flex-col gap-6">
            {/* Title */}
            <div>
              <Input
                {...register('title')}
                placeholder={messages.shop.titlePlaceholder}
                className="border-none bg-transparent px-0 text-3xl font-bold tracking-tight placeholder:text-muted-foreground/40 focus-visible:ring-0 focus-visible:ring-offset-0"
                aria-label={messages.shop.titlePlaceholder}
              />
              {errors.title && (
                <p className="mt-1 text-sm text-destructive">{errors.title.message}</p>
              )}
            </div>

            {/* Slug */}
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-sm text-muted-foreground">/shop/</span>
              <Input
                value={watchSlug}
                onChange={handleSlugChange}
                placeholder={messages.shop.slugPlaceholder}
                className="text-sm text-muted-foreground"
                aria-label={messages.shop.slugPlaceholder}
              />
              {errors.slug && (
                <p className="shrink-0 text-sm text-destructive">{errors.slug.message}</p>
              )}
            </div>

            {/* WYSIWYG Editor */}
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <ProductTiptapEditor
                  content={(field.value as TiptapContent) ?? EMPTY_CONTENT}
                  onChange={field.onChange}
                  placeholder={messages.shop.contentPlaceholder}
                />
              )}
            />
          </div>

          {/* RIGHT COLUMN — Sidebar cards */}
          <div className="flex flex-col gap-6">
            {/* Settings */}
            <ProductSettingsSidebar
              register={register}
              watch={watch}
              setValue={setValue}
              control={control}
              errors={errors}
              coverPreview={coverPreview}
              onCoverChange={handleCoverChange}
            />

            {/* Image Gallery */}
            <ProductImageManager
              images={watchImages}
              onChange={handleImagesChange}
              coverImageUrl={coverPreview}
              onSetCover={handleSetCoverFromGallery}
            />

            {/* SEO */}
            <ProductSeoSidebar
              register={register}
              watch={watch}
              control={control}
              errors={errors as Record<string, { message?: string }>}
            />

            {/* Marketplace Publish */}
            <MarketplacePublishPanel productId={product?.id ?? null} />

            {/* Status card */}
            <Card className="shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold">
                  {messages.shop.statusTitle}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{messages.shop.statusTitle}</span>
                  <span
                    className={
                      watchIsPublished
                        ? 'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground border-border'
                    }
                  >
                    {watchIsPublished ? messages.common.published : messages.common.draft}
                  </span>
                </div>

                {product?.published_at && watchIsPublished && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{messages.shop.publishDate}</span>
                    <span className="text-xs">
                      {new Date(product.published_at).toLocaleDateString('pl-PL', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                )}

                {product?.updated_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{messages.shop.lastEdited}</span>
                    <span className="text-xs">
                      {new Date(product.updated_at).toLocaleDateString('pl-PL', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
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
                    {deleteState === 'deleting' ? messages.common.loading : messages.common.delete}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{messages.shop.deleteProductConfirmTitle}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {messages.shop.deleteProductConfirmDescription(product.title)}
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
    </div>
  )
}
