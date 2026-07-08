import type { UseFormRegister, UseFormSetValue, UseFormWatch } from 'react-hook-form'
import { CollapsibleCard, Input, Label } from '@agency/ui'
import { Info } from 'lucide-react'
import { messages } from '@/lib/messages'
import type { CreateCampaignInput } from '../validation'
import { LogoMediaField } from './LogoMediaField'

// Brand token editor (so_campaigns.brand JSONB). Color/font stay plain text inputs
// — brand is PUBLIC (rendered on the landing), hence the sensitive-data warning.
// No native OS color picker inside the form (ag-design-patterns: no native chooser
// in Radix). The logo is picked from the media library (LogoMediaField) instead of
// a raw URL input, so it needs controlled read/write via watch + setValue.

interface CampaignBrandEditorProps {
  register: UseFormRegister<CreateCampaignInput>
  watch: UseFormWatch<CreateCampaignInput>
  setValue: UseFormSetValue<CreateCampaignInput>
}

export function CampaignBrandEditor({ register, watch, setValue }: CampaignBrandEditorProps) {
  return (
    <CollapsibleCard title={messages.venture.brandTitle} defaultOpen>
      <div className="space-y-4">
        <p className="flex items-start gap-2 rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-500/90">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{messages.venture.brandHelp}</span>
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <BrandField
            id="brand-primary"
            label={messages.venture.brandPrimaryLabel}
            placeholder={messages.venture.brandColorPlaceholder}
            {...register('brand.primary')}
          />
          <BrandField
            id="brand-accent"
            label={messages.venture.brandAccentLabel}
            placeholder={messages.venture.brandColorPlaceholder}
            {...register('brand.accent')}
          />
          <BrandField
            id="brand-bg"
            label={messages.venture.brandBgLabel}
            placeholder={messages.venture.brandColorPlaceholder}
            {...register('brand.bg')}
          />
        </div>

        <LogoMediaField
          value={watch('brand.logo_url') ?? null}
          onChange={(url) => setValue('brand.logo_url', url ?? '', { shouldDirty: true })}
        />

        <BrandField
          id="brand-font"
          label={messages.venture.brandFontLabel}
          placeholder={messages.venture.brandFontPlaceholder}
          {...register('brand.font')}
        />
      </div>
    </CollapsibleCard>
  )
}

// Small labelled input — forwards the RHF register ref/props via spread.
const BrandField = ({
  id,
  label,
  placeholder,
  ...field
}: {
  id: string
  label: string
  placeholder: string
} & ReturnType<UseFormRegister<CreateCampaignInput>>) => (
  <div className="space-y-1.5">
    <Label htmlFor={id} className="text-sm font-medium">
      {label}
    </Label>
    <Input id={id} placeholder={placeholder} className="text-sm" {...field} />
  </div>
)
