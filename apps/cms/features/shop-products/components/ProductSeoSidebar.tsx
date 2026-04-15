

import type { UseFormRegister, UseFormWatch, Control } from 'react-hook-form'
import { Controller } from 'react-hook-form'
import {
  CollapsibleCard,
  Input,
  Label,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@agency/ui'
import { HelpCircle } from 'lucide-react'
import { messages } from '@/lib/messages'
import { KeywordSelect } from '@/features/site-settings/components/KeywordSelect'
import { getKeywordPool } from '@/features/site-settings/queries'
import { siteSettingsKeys } from '@/features/site-settings/types'
import { useQuery } from '@tanstack/react-query'
import type { CreateShopProductFormData } from '../validation'

interface ProductSeoSidebarProps {
  register: UseFormRegister<CreateShopProductFormData>
  watch: UseFormWatch<CreateShopProductFormData>
  control: Control<CreateShopProductFormData>
  errors: Record<string, { message?: string }>
}

export function ProductSeoSidebar({ register, watch, control, errors }: ProductSeoSidebarProps) {
  const watchSeoDescription = watch('seo_metadata.description')

  const { data: keywordPool = [], isLoading: isPoolLoading } = useQuery({
    queryKey: siteSettingsKeys.keywordPool,
    queryFn: getKeywordPool,
  })

  return (
    <CollapsibleCard title={messages.shop.seoTitle} defaultOpen={false}>
      <div className="space-y-5">
        <TooltipProvider delayDuration={300}>
          {/* SEO Title */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="seo-title" className="text-sm font-medium">
                {messages.shop.seoTitleLabel}
              </Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={messages.shop.seoTitleHint}
                  >
                    <HelpCircle className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p>{messages.shop.seoTitleHint}</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Input
              id="seo-title"
              {...register('seo_metadata.title')}
              placeholder={messages.shop.seoTitlePlaceholder}
              className="text-sm"
            />
          </div>

          {/* SEO Description */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Label htmlFor="seo-description" className="text-sm font-medium">
                  {messages.shop.seoDescriptionLabel}
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={messages.shop.seoDescriptionHint}
                    >
                      <HelpCircle className="h-3 w-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs">
                    <p>{messages.shop.seoDescriptionHint}</p>
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
              placeholder={messages.shop.seoDescriptionPlaceholder}
              className="min-h-[60px] resize-none text-sm"
              maxLength={160}
              autoResize
            />
            {errors['seo_metadata.description'] && (
              <p className="text-xs text-destructive">
                {errors['seo_metadata.description'].message}
              </p>
            )}
          </div>

          {/* OG Image */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="seo-og-image" className="text-sm font-medium">
                {messages.shop.seoOgImageLabel}
              </Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={messages.shop.seoOgImageHint}
                  >
                    <HelpCircle className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p>{messages.shop.seoOgImageHint}</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Input
              id="seo-og-image"
              {...register('seo_metadata.ogImage')}
              placeholder={messages.shop.seoOgImagePlaceholder}
              className="text-sm"
            />
          </div>

          {/* Keywords */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="seo-keywords" className="text-sm font-medium">
                {messages.shop.seoKeywordsLabel}
              </Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={messages.shop.seoKeywordsHint}
                  >
                    <HelpCircle className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p>{messages.shop.seoKeywordsHint}</p>
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
      </div>
    </CollapsibleCard>
  )
}
