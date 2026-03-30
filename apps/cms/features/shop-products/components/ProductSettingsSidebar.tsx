'use client'

import { useState, useCallback } from 'react'
import type { UseFormRegister, UseFormWatch, UseFormSetValue, Control, FieldErrors } from 'react-hook-form'
import { Controller } from 'react-hook-form'
import {
  CollapsibleCard,
  Input,
  Label,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button,
} from '@agency/ui'
import { X } from 'lucide-react'
import { messages } from '@/lib/messages'
import { InsertMediaModal } from '@/features/media/components/InsertMediaModal'
import type { CreateShopProductFormData } from '../validation'
import { LayoutSelector } from './LayoutSelector'
import { ShopCategorySelect } from './ShopCategorySelect'

interface ProductSettingsSidebarProps {
  register: UseFormRegister<CreateShopProductFormData>
  watch: UseFormWatch<CreateShopProductFormData>
  setValue: UseFormSetValue<CreateShopProductFormData>
  control: Control<CreateShopProductFormData>
  errors: FieldErrors<CreateShopProductFormData>
  coverPreview: string | null
  onCoverChange: (url: string | null) => void
}

export function ProductSettingsSidebar({
  register,
  watch,
  setValue,
  control,
  errors,
  coverPreview,
  onCoverChange,
}: ProductSettingsSidebarProps) {
  const listingType = watch('listing_type')
  const watchShortDescription = watch('short_description')
  const watchTags = watch('tags')
  const [tagInput, setTagInput] = useState('')
  const [coverModalOpen, setCoverModalOpen] = useState(false)

  // InsertMediaModal requires an Editor prop. Minimal proxy that captures
  // the image URL when InsertMediaModal calls editor.chain().focus().setImage().
  const coverEditorProxy = {
    chain: () => {
      const chainProxy = {
        focus: () => chainProxy,
        setImage: ({ src }: { src: string }) => {
          onCoverChange(src)
          return chainProxy
        },
        setVideo: () => chainProxy,
        setYouTube: () => chainProxy,
        setVimeo: () => chainProxy,
        setInstagram: () => chainProxy,
        setTikTok: () => chainProxy,
        run: () => true,
      }
      return chainProxy
    },
  }

  // --- Tag management ---

  const handleAddTag = useCallback(
    (tag: string) => {
      const trimmed = tag.trim()
      if (!trimmed) return
      const current = watchTags ?? []
      if (!current.includes(trimmed)) {
        setValue('tags', [...current, trimmed])
      }
      setTagInput('')
    },
    [watchTags, setValue]
  )

  const handleRemoveTag = useCallback(
    (index: number) => {
      const current = watchTags ?? []
      setValue(
        'tags',
        current.filter((_, i) => i !== index)
      )
    },
    [watchTags, setValue]
  )

  const handleTagKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault()
        handleAddTag(tagInput)
      }
    },
    [tagInput, handleAddTag]
  )

  return (
    <CollapsibleCard title={messages.shop.settingsTitle} defaultOpen>
      <div className="space-y-5">
        {/* Listing Type */}
        <div className="space-y-1.5">
          <Label htmlFor="listing-type" className="text-sm font-medium">
            {messages.shop.listingTypeLabel}
          </Label>
          <Controller
            name="listing_type"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="listing-type" className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="external_link">
                    {messages.shop.listingTypeExternalLink}
                  </SelectItem>
                  <SelectItem value="digital_download">
                    {messages.shop.listingTypeDigitalDownload}
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {errors.listing_type && (
            <p className="text-xs text-destructive">{errors.listing_type.message}</p>
          )}
        </div>

        {/* Conditional: External URL */}
        {listingType === 'external_link' && (
          <div className="space-y-1.5">
            <Label htmlFor="external-url" className="text-sm font-medium">
              {messages.shop.externalUrlLabel}
            </Label>
            <Input
              id="external-url"
              {...register('external_url')}
              placeholder={messages.shop.externalUrlPlaceholder}
              className="text-sm"
            />
            {errors.external_url && (
              <p className="text-xs text-destructive">{errors.external_url.message}</p>
            )}
          </div>
        )}

        {/* Conditional: Digital file fields */}
        {listingType === 'digital_download' && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">{messages.shop.digitalFileLabel}</Label>
            <div className="space-y-1.5">
              <Input
                {...register('digital_file_url')}
                placeholder={messages.shop.digitalFileUrlPlaceholder}
                className="text-sm"
                aria-label="URL pliku do pobrania"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input
                {...register('digital_file_name')}
                placeholder="Nazwa pliku..."
                className="text-sm"
                aria-label="Nazwa pliku"
              />
              <Input
                {...register('digital_file_size', { valueAsNumber: true })}
                type="number"
                placeholder="Rozmiar (B)"
                className="text-sm"
                aria-label="Rozmiar pliku w bajtach"
              />
            </div>
          </div>
        )}

        {/* Display Layout */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">{messages.shop.displayLayoutLabel}</Label>
          <Controller
            name="display_layout"
            control={control}
            render={({ field }) => (
              <LayoutSelector value={field.value} onChange={field.onChange} />
            )}
          />
        </div>

        {/* Category */}
        <div className="space-y-1.5">
          <Label htmlFor="product-category" className="text-sm font-medium">
            {messages.shop.categoryLabel}
          </Label>
          <Controller
            name="category_id"
            control={control}
            render={({ field }) => (
              <ShopCategorySelect
                id="product-category"
                value={field.value ?? null}
                onChange={field.onChange}
              />
            )}
          />
        </div>

        {/* Price */}
        <div className="space-y-1.5">
          <Label htmlFor="product-price" className="text-sm font-medium">
            {messages.shop.priceLabel}
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id="product-price"
              type="number"
              step="0.01"
              min="0"
              {...register('price', { valueAsNumber: true })}
              placeholder={messages.shop.pricePlaceholder}
              className="text-sm"
            />
            <span className="shrink-0 text-sm text-muted-foreground">PLN</span>
          </div>
          {errors.price && (
            <p className="text-xs text-destructive">{errors.price.message}</p>
          )}
        </div>

        {/* Short Description */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="short-description" className="text-sm font-medium">
              {messages.shop.shortDescriptionLabel}
            </Label>
            <span className="text-xs text-muted-foreground">
              {(watchShortDescription?.length ?? 0)}/300
            </span>
          </div>
          <Textarea
            id="short-description"
            {...register('short_description')}
            placeholder={messages.shop.shortDescriptionPlaceholder}
            className="min-h-[80px] resize-none text-sm"
            maxLength={300}
            autoResize
          />
          {errors.short_description && (
            <p className="text-xs text-destructive">{errors.short_description.message}</p>
          )}
        </div>

        {/* Tags */}
        <div className="space-y-1.5">
          <Label htmlFor="product-tags" className="text-sm font-medium">
            {messages.shop.tagsLabel}
          </Label>
          <Input
            id="product-tags"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            placeholder={messages.shop.tagsPlaceholder}
            className="text-sm"
          />
          {watchTags && watchTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {watchTags.map((tag, index) => (
                <span
                  key={`${tag}-${index}`}
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(index)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={`Usuń tag: ${tag}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Cover Image */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">{messages.shop.coverImageLabel}</Label>

          {coverPreview ? (
            <div className="group relative overflow-hidden rounded-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverPreview}
                alt="Zdjęcie główne produktu"
                className="aspect-video w-full rounded-lg object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="bg-background/90 text-xs"
                  onClick={() => setCoverModalOpen(true)}
                >
                  {messages.common.change}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="bg-background/90 text-xs text-destructive"
                  onClick={() => onCoverChange(null)}
                >
                  {messages.common.delete}
                </Button>
              </div>
            </div>
          ) : (
            <div
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/40 px-4 py-6 transition-colors hover:border-primary/40 hover:bg-muted/60"
              onClick={() => setCoverModalOpen(true)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') setCoverModalOpen(true)
              }}
              aria-label="Wybierz zdjęcie główne"
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
              <p className="text-xs text-muted-foreground">Kliknij aby wybrać</p>
            </div>
          )}

          <InsertMediaModal
            editor={coverEditorProxy as never}
            open={coverModalOpen}
            onClose={() => setCoverModalOpen(false)}
          />
        </div>
      </div>
    </CollapsibleCard>
  )
}
