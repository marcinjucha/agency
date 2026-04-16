

import { type Control, type UseFormRegister, type FieldErrors, Controller } from 'react-hook-form'
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
import { KeywordSelect } from '@/features/site-settings/components/KeywordSelect'
import { messages } from '@/lib/messages'
import type { BlogPostFormData } from '../validation'

interface BlogSeoCardProps {
  register: UseFormRegister<BlogPostFormData>
  control: Control<BlogPostFormData>
  errors: FieldErrors<BlogPostFormData>
  watchSeoDescription: string | undefined
  keywordPool: string[]
  isPoolLoading: boolean
}

export function BlogSeoCard({
  register,
  control,
  errors,
  watchSeoDescription,
  keywordPool,
  isPoolLoading,
}: BlogSeoCardProps) {
  return (
    <CollapsibleCard title={messages.blog.seoTitle} defaultOpen={false}>
      <div className="space-y-5">
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
                    aria-label={messages.blog.seoTitleTooltip}
                  >
                    <HelpCircle className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p>
                    Jeśli pusty, użyty zostanie tytuł artykułu. Zalecana długość: 50-60
                    znaków.
                  </p>
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
                      aria-label={messages.blog.seoDescriptionTooltip}
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
                {watchSeoDescription?.length ?? 0}/160
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
                {messages.blog.ogImageLabel}
              </Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={messages.blog.ogImageTooltip}
                  >
                    <HelpCircle className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p>
                    Obraz wyświetlany przy udostępnianiu w mediach społecznościowych. Jeśli
                    pusty, użyty zostanie obrazek okładkowy.
                  </p>
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
                    aria-label={messages.blog.seoKeywordsTooltip}
                  >
                    <HelpCircle className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p>
                    Słowa kluczowe pomagają w pozycjonowaniu. Wybierz istniejące lub dodaj
                    nowe.
                  </p>
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
