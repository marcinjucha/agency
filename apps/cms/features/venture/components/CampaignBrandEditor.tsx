import type { UseFormRegister, UseFormSetValue, UseFormWatch } from 'react-hook-form'
import { Input, Label } from '@agency/ui'
import { messages } from '@/lib/messages'
import { ColorPicker } from '@/components/ui/color-picker'
import type { CreateCampaignInput } from '../validation'
import { LogoMediaField } from './LogoMediaField'

// Brand token editor (so_campaigns.brand JSONB) = MODE 3 ("Własny wygląd") of
// CampaignThemeCard. Colors use the shared inline ColorPicker (react-colorful
// HexColorPicker in a Popover — no native OS chooser, so it satisfies
// ag-design-patterns: no native chooser in Radix). Font stays a plain text
// input. The logo is picked from the media library (LogoMediaField) instead of
// a raw URL input, so it needs controlled read/write via watch + setValue —
// colors are wired the same controlled way.
//
// Renders ONLY the fields (no CollapsibleCard, no public banner): the wrapper
// CampaignThemeCard owns the single "Wygląd kampanii" card and hoists the amber
// public banner to card level (a library theme is also public, so the banner is
// mode-agnostic).

interface CampaignBrandEditorProps {
  register: UseFormRegister<CreateCampaignInput>
  watch: UseFormWatch<CreateCampaignInput>
  setValue: UseFormSetValue<CreateCampaignInput>
}

export function CampaignBrandEditor({ register, watch, setValue }: CampaignBrandEditorProps) {
  return (
    <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="brand-primary" className="text-sm font-medium">
              {messages.venture.brandPrimaryLabel}
            </Label>
            <ColorPicker
              id="brand-primary"
              label={messages.venture.brandPrimaryLabel}
              value={watch('brand.primary') ?? ''}
              onChange={(hex) => setValue('brand.primary', hex, { shouldDirty: true })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="brand-accent" className="text-sm font-medium">
              {messages.venture.brandAccentLabel}
            </Label>
            <ColorPicker
              id="brand-accent"
              label={messages.venture.brandAccentLabel}
              value={watch('brand.accent') ?? ''}
              onChange={(hex) => setValue('brand.accent', hex, { shouldDirty: true })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="brand-bg" className="text-sm font-medium">
              {messages.venture.brandBgLabel}
            </Label>
            <ColorPicker
              id="brand-bg"
              label={messages.venture.brandBgLabel}
              value={watch('brand.bg') ?? ''}
              onChange={(hex) => setValue('brand.bg', hex, { shouldDirty: true })}
            />
          </div>
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
