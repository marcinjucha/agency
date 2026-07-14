import { useState } from 'react'
import type { UseFormRegister, UseFormSetValue, UseFormWatch } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { CollapsibleCard, Label, RadioGroup, RadioGroupItem } from '@agency/ui'
import { Info } from 'lucide-react'
import type { Json } from '@agency/database'
import { messages } from '@/lib/messages'
import { queryKeys } from '@/lib/query-keys'
import {
  brandToThemeTokens,
  HALO_EFEKT_DEFAULT,
  resolveClientTheme,
  type ThemeTokens,
} from '@/lib/theme'
import { ThemePicker } from '@/features/themes/components/ThemePicker'
import { listThemesFn } from '@/features/themes/server'
import { ThemePreview } from '@/features/themes/components/ThemePreview'
import type { CreateCampaignInput } from '../validation'
import { CampaignBrandEditor } from './CampaignBrandEditor'

// ---------------------------------------------------------------------------
// Campaign tier (iter E4) — the ONE "Wygląd kampanii" card, 3-way mode.
//
// Wraps the three ways a campaign can be branded (design § Campaign tier → UX):
//   1. inherit  — theme_id=null + brand=null → resolves the CLIENT theme.
//   2. library  — a named so_themes row via <ThemePicker level="campaign"
//                 hideModeRadio> (combobox only; THIS card owns the outer radio).
//   3. own      — the freeform <CampaignBrandEditor> over so_campaigns.brand
//                 (the dominant per-campaign case + the live landing contract).
//
// This wrapper's `mode` state owns which branch renders — NOT ThemePicker's
// internal state (that avoids the client-tier "showOwn" ambiguity). The amber
// public banner is hoisted here (card level) because it is mode-agnostic: a
// library theme is just as public as a freeform brand. No manual memoization
// (React Compiler on).
// ---------------------------------------------------------------------------

type Mode = 'inherit' | 'library' | 'own'

const EMPTY_BRAND: NonNullable<CreateCampaignInput['brand']> = {
  primary: '',
  accent: '',
  bg: '',
  logo_url: '',
  font: '',
}

interface CampaignThemeCardProps {
  register: UseFormRegister<CreateCampaignInput>
  watch: UseFormWatch<CreateCampaignInput>
  setValue: UseFormSetValue<CreateCampaignInput>
}

/** True when the freeform brand carries at least one non-empty token. */
function brandHasTokens(brand: CreateCampaignInput['brand']): boolean {
  if (!brand) return false
  return Object.values(brand).some((value) => typeof value === 'string' && value.trim() !== '')
}

/** Init rule (avoids the showOwn bug): brand → own; else theme_id → library; else inherit. */
function initialMode(brand: CreateCampaignInput['brand'], themeId: string | null): Mode {
  if (brandHasTokens(brand)) return 'own'
  if (themeId) return 'library'
  return 'inherit'
}

export function CampaignThemeCard({ register, watch, setValue }: CampaignThemeCardProps) {
  const themeId = watch('theme_id') ?? null
  const brand = watch('brand')

  const [mode, setMode] = useState<Mode>(() => initialMode(brand, themeId))

  // Library-mode preview needs the picked theme's tokens. Same query key as the
  // picker → React Query dedupes; no extra network round-trip.
  const { data: themes = [] } = useQuery({
    queryKey: queryKeys.themes.all,
    queryFn: () => listThemesFn(),
  })

  function selectMode(next: Mode) {
    setMode(next)
    if (next === 'inherit') {
      setValue('theme_id', null, { shouldDirty: true })
      setValue('brand', null, { shouldDirty: true })
    } else if (next === 'library') {
      // A named theme is authoritative — clear any freeform brand.
      setValue('brand', null, { shouldDirty: true })
    } else {
      // own — a freeform brand is authoritative; clear the named theme_id and
      // ensure the brand object exists for the (controlled) brand editor.
      setValue('theme_id', null, { shouldDirty: true })
      if (!brand) setValue('brand', EMPTY_BRAND, { shouldDirty: true })
    }
  }

  // Best-effort 3-tier preview (authoritative resolve is server-side, iter E3):
  //   own     → the campaign brand mapped onto theme tokens
  //   library → the picked theme's stored tokens
  //   inherit → neutral Halo default (client/tenant tokens aren't fetched here)
  // ThemePreview backfills every token via resolveClientTheme, so a partial blob
  // renders correctly.
  const previewTokens: ThemeTokens =
    mode === 'own'
      ? brandToThemeTokens((brand ?? null) as Json | null)
      : mode === 'library'
        ? (themes.find((theme) => theme.id === themeId)?.tokens ?? {})
        : {}

  const inheritSwatch = resolveClientTheme({ tenantTheme: null, clientTheme: {} }).primary

  return (
    <CollapsibleCard title={messages.venture.campaignThemeTitle} defaultOpen>
      <div className="space-y-4">
        {/* Card-level public banner — mode-agnostic (hoisted from the brand editor). */}
        <p
          role="status"
          className="flex items-start gap-2 rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-500/90"
        >
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{messages.venture.campaignThemePublicBanner}</span>
        </p>

        {/* 3-way mode radio (mirrors the client-tier inherit/own visual). */}
        <RadioGroup
          value={mode}
          onValueChange={(next) => selectMode(next as Mode)}
          aria-label={messages.venture.campaignThemeModeGroupLabel}
          className="gap-3"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="inherit" id="campaign-theme-inherit" />
            <Label htmlFor="campaign-theme-inherit" className="text-sm font-normal">
              {messages.venture.campaignThemeModeInherit}
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="library" id="campaign-theme-library" />
            <Label htmlFor="campaign-theme-library" className="text-sm font-normal">
              {messages.venture.campaignThemeModeLibrary}
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="own" id="campaign-theme-own" />
            <Label htmlFor="campaign-theme-own" className="text-sm font-normal">
              {messages.venture.campaignThemeModeOwn}
            </Label>
          </div>
        </RadioGroup>

        {/* Mode branch */}
        {mode === 'inherit' ? (
          <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-3 py-2">
            <span
              aria-hidden="true"
              className="h-4 w-4 shrink-0 rounded-full border border-border/60"
              style={{ backgroundColor: inheritSwatch }}
            />
            <span className="text-xs text-muted-foreground">
              {messages.venture.campaignThemeInheritHint}
            </span>
          </div>
        ) : null}

        {mode === 'library' ? (
          <ThemePicker
            level="campaign"
            hideModeRadio
            inheritedFromLabel={messages.themes.picker.clientInheritLabel}
            value={themeId}
            onChange={(id) => {
              setValue('theme_id', id, { shouldDirty: true })
              setValue('brand', null, { shouldDirty: true })
            }}
          />
        ) : null}

        {mode === 'own' ? (
          <CampaignBrandEditor register={register} watch={watch} setValue={setValue} />
        ) : null}

        {/* 3-tier resolved preview (best-effort). */}
        <ThemePreview tokens={previewTokens} />

        {mode === 'inherit' ? (
          <p className="text-xs text-muted-foreground">
            {messages.venture.campaignThemePreviewNote}
          </p>
        ) : null}
      </div>
    </CollapsibleCard>
  )
}
