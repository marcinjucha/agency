import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  RadioGroup,
  RadioGroupItem,
  cn,
} from '@agency/ui'
import { Check, ChevronsUpDown, Plus } from 'lucide-react'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'
import { queryKeys } from '@/lib/query-keys'
import { resolveClientTheme } from '@/lib/theme'
import { listThemesFn } from '../server'
import type { ThemeWithUsage } from '../types'

// ---------------------------------------------------------------------------
// Theme Manager (iter D3b) — reusable, controlled theme picker.
//
// One component drives ALL assignment tiers (design § "Assignment UX"):
//   • level 'org'      — the tenant base. No inherit affordance (it IS the base);
//                        unset (null) falls to HALO_EFEKT_DEFAULT. Just a combobox.
//   • level 'client'   — a radio group: "Dziedziczy z <from>" (writes null) vs
//                        "Własny motyw" (writes a theme_id via the combobox).
//   • level 'campaign' — used with `hideModeRadio` from CampaignThemeCard, which
//                        owns the outer 3-way mode radio. Renders ONLY the
//                        combobox + effective chip (no inherit/own radio — that
//                        would nest a radio inside the wrapper's radio).
//
// Always renders the resolved "Efektywny motyw: <name>" chip so the operator
// sees what the row will actually wear. Controlled — the parent form owns the
// value; this only reads the library for the combobox options. No manual
// memoization (React Compiler on).
// ---------------------------------------------------------------------------

type ThemePickerLevel = 'org' | 'client' | 'campaign'

interface ThemePickerProps {
  /** The stored `theme_id` — null means "inherit" (client/campaign) / "default" (org). */
  value: string | null
  onChange: (id: string | null) => void
  level: ThemePickerLevel
  /** Name of the theme this row falls back to (client/campaign tier). */
  inheritedThemeName?: string | null
  /** What the row inherits FROM, e.g. "organizacji" / "klienta". */
  inheritedFromLabel?: string
  /**
   * Suppress the internal inherit/own radio and render only the combobox +
   * effective chip. Used by CampaignThemeCard, whose own 3-way RadioGroup owns
   * mode selection — the picker just supplies the library-theme combobox.
   */
  hideModeRadio?: boolean
  /** Base id for label association / a11y. */
  id?: string
}

/** A single representative swatch colour for a theme (its resolved primary). */
function themeSwatch(theme: ThemeWithUsage): string {
  return resolveClientTheme({ tenantTheme: null, clientTheme: theme.tokens }).primary
}

export function ThemePicker({
  value,
  onChange,
  level,
  inheritedThemeName,
  inheritedFromLabel,
  hideModeRadio = false,
  id = 'theme-picker',
}: ThemePickerProps) {
  const { data: themes = [], isLoading } = useQuery({
    queryKey: queryKeys.themes.all,
    queryFn: () => listThemesFn(),
  })

  // Client tier only: whether the "own theme" branch is expanded. A stored
  // value forces it open; the local flag lets the operator pick "own" and reveal
  // the combobox BEFORE choosing a theme (value still null at that moment).
  const [ownSelected, setOwnSelected] = useState(false)
  // The inherit/own radio is a CLIENT-tier affordance. `hideModeRadio` (campaign
  // tier) suppresses it — the wrapper owns mode selection, so the combobox is
  // always shown.
  const showRadio = level === 'client' && !hideModeRadio
  const showOwn = !showRadio || ownSelected || value !== null

  function handleMode(mode: string) {
    if (mode === 'inherit') {
      setOwnSelected(false)
      onChange(null)
    } else {
      setOwnSelected(true)
    }
  }

  const effectiveName = resolveEffectiveName()

  function resolveEffectiveName(): string {
    if (value) {
      const selected = themes.find((theme) => theme.id === value)
      return selected?.name ?? messages.themes.picker.defaultThemeName
    }
    if (level !== 'org') {
      return inheritedThemeName || messages.themes.picker.orgThemeName
    }
    return messages.themes.picker.defaultThemeName
  }

  const combobox = (
    <ThemeCombobox
      id={`${id}-combobox`}
      themes={themes}
      isLoading={isLoading}
      value={value}
      onChange={(next) => {
        setOwnSelected(next !== null)
        onChange(next)
      }}
    />
  )

  return (
    <div className="space-y-4">
      {showRadio ? (
        <RadioGroup
          value={showOwn ? 'own' : 'inherit'}
          onValueChange={handleMode}
          aria-label={messages.themes.picker.radioGroupLabel}
          className="gap-3"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="inherit" id={`${id}-inherit`} />
            <Label htmlFor={`${id}-inherit`} className="text-sm font-normal">
              {messages.themes.picker.inheritOption(
                inheritedFromLabel ?? messages.themes.picker.orgThemeName,
              )}
              {inheritedThemeName ? (
                <span className="ml-1 text-muted-foreground">— {inheritedThemeName}</span>
              ) : null}
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="own" id={`${id}-own`} />
            <Label htmlFor={`${id}-own`} className="text-sm font-normal">
              {messages.themes.picker.ownOption}
            </Label>
          </div>
        </RadioGroup>
      ) : null}

      {showOwn ? combobox : null}

      {/* Resolved / effective theme chip — always visible. */}
      <p className="text-xs text-muted-foreground">
        {messages.themes.picker.effectiveLabel}:{' '}
        <span className="font-medium text-foreground">{effectiveName}</span>
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Combobox — searchable theme list + swatch + inline "+ Nowy motyw" link.
// Shared by the org tier and the client "own theme" branch.
// ---------------------------------------------------------------------------

interface ThemeComboboxProps {
  id: string
  themes: ThemeWithUsage[]
  isLoading: boolean
  value: string | null
  onChange: (id: string | null) => void
}

function ThemeCombobox({ id, themes, isLoading, value, onChange }: ThemeComboboxProps) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const selected = themes.find((theme) => theme.id === value)

  if (isLoading) {
    return <p className="text-xs text-muted-foreground">{messages.themes.picker.loading}</p>
  }

  // No themes yet — the combobox would be empty, so surface a direct affordance.
  if (themes.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">{messages.themes.picker.emptyHint}</p>
        <Button variant="outline" size="sm" asChild>
          <Link to={routes.admin.themeNew}>
            <Plus className="mr-2 h-4 w-4" />
            {messages.themes.picker.newTheme}
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between text-sm font-normal"
        >
          {selected ? (
            <span className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden="true"
                className="h-4 w-4 shrink-0 rounded-full border border-border/60"
                style={{ backgroundColor: themeSwatch(selected) }}
              />
              <span className="truncate">{selected.name}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">
              {messages.themes.picker.selectPlaceholder}
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder={messages.themes.picker.searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{messages.themes.picker.noResults}</CommandEmpty>
            <CommandGroup>
              {themes.map((theme) => (
                <CommandItem
                  key={theme.id}
                  value={theme.name}
                  onSelect={() => {
                    onChange(theme.id === value ? null : theme.id)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === theme.id ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <span
                    aria-hidden="true"
                    className="mr-2 h-4 w-4 shrink-0 rounded-full border border-border/60"
                    style={{ backgroundColor: themeSwatch(theme) }}
                  />
                  <span className="truncate">{theme.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup>
              <CommandItem
                className="text-muted-foreground"
                onSelect={() => {
                  setOpen(false)
                  navigate({ to: routes.admin.themeNew })
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                {messages.themes.picker.newTheme}
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
