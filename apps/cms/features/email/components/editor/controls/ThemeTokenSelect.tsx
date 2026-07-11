import { useId } from 'react'
import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@agency/ui'
import { THEME_COLOR_TOKEN_KEYS, type ThemeColorTokenKey } from '@/lib/theme'
import { messages } from '@/lib/messages'
import { useResolvedEmailTheme } from '../../../hooks/use-resolved-email-theme'

/**
 * ThemeTokenSelect — pick a THEME TOKEN instead of a raw hex for a colour slot.
 *
 * Minimal control: a <Select> listing the 9 theme tokens (each with its resolved
 * swatch) plus a "Własny kolor" option that means "no token — use the custom
 * ColorPicker below". Selecting a token → onChange(token); selecting custom →
 * onChange(undefined). Pairs with an existing ColorPicker in the parent section;
 * the parent clears the raw hex when a token is chosen (and vice-versa).
 */

// SelectItem value cannot be empty string (Radix reserves it) — sentinel for
// the "use custom hex" option.
const CUSTOM_VALUE = '__custom__'

export interface ThemeTokenSelectProps {
  /** Currently selected token key, or undefined when a custom hex is in use. */
  value: string | undefined
  onChange: (token: string | undefined) => void
  label: string
}

export function ThemeTokenSelect({ value, onChange, label }: ThemeTokenSelectProps) {
  const selectId = useId()
  const theme = useResolvedEmailTheme()
  const current = value ?? CUSTOM_VALUE

  return (
    <div className="space-y-1">
      <Label htmlFor={selectId} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      <Select
        value={current}
        onValueChange={(next) => onChange(next === CUSTOM_VALUE ? undefined : next)}
      >
        <SelectTrigger id={selectId} className="h-9 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={CUSTOM_VALUE} className="text-xs">
            {messages.email.inspectorColorSourceCustom}
          </SelectItem>
          {THEME_COLOR_TOKEN_KEYS.map((token) => (
            <SelectItem key={token} value={token} className="text-xs">
              <span className="flex items-center gap-2">
                <span
                  className="h-3.5 w-3.5 shrink-0 rounded-sm border border-border/50"
                  style={{ backgroundColor: theme[token] ?? 'transparent' }}
                  aria-hidden="true"
                />
                {messages.email.themeTokenLabels[token as ThemeColorTokenKey]}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
