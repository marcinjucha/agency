import { useId } from 'react'
import { RotateCcw } from 'lucide-react'
import { Label, Button } from '@agency/ui'
import type {
  BlockBorder,
  BorderableBlockType,
  BorderRadiusToken,
} from '@agency/email'
import { messages } from '@/lib/messages'
import { ColorPicker } from '@/components/ui/color-picker'
import { SegmentedControl } from './SegmentedControl'
import { ThemeTokenSelect } from './ThemeTokenSelect'

/**
 * BorderSection — minimalny edytor obramowania i tła.
 *
 * Tylko 3 kontrolki:
 *   1. Kolor obramowania (ColorPicker — opcjonalny; brak = brak obramowania)
 *   2. Zaokrąglenie (SegmentedControl: Brak / Łagodne / Pigułka)
 *   3. Kolor tła (ColorPicker — opcjonalny, z resetem)
 *
 * `borderWidth` / `borderStyle` usunięte — renderer rysuje 1px solid gdy
 * `borderColor` jest ustawiony, nic gdy nie. Sterowanie linii w mailach
 * (dashed/dotted/grube linie) i tak nie ma sensu — większość email klientów
 * normalizuje style do solid 1px.
 */
export interface BorderSectionProps {
  blockType: BorderableBlockType
  value: Partial<BlockBorder>
  defaults: Partial<BlockBorder>
  onChange: (next: Partial<BlockBorder>) => void
}

type BorderRadiusKey = BorderRadiusToken

export function BorderSection({ value, defaults, onChange }: BorderSectionProps) {
  const borderColorId = useId()
  const bgColorId = useId()

  function update<K extends keyof BlockBorder>(key: K, next: BlockBorder[K] | undefined) {
    const merged: Partial<BlockBorder> = { ...value }
    if (next === undefined) {
      delete merged[key]
    } else {
      merged[key] = next
    }
    onChange(merged)
  }

  // Token vs raw hex are mutually exclusive per colour slot (see TypographySection).
  // `tokenKey`/`rawKey` name the paired fields so both border + background reuse
  // the same clear logic.
  function selectToken(
    tokenKey: 'borderColorToken' | 'backgroundColorToken',
    rawKey: 'borderColor' | 'backgroundColor',
    token: string | undefined,
  ) {
    const merged: Partial<BlockBorder> = { ...value }
    if (token === undefined) {
      delete merged[tokenKey]
    } else {
      merged[tokenKey] = token
      delete merged[rawKey]
    }
    onChange(merged)
  }

  function setCustomColor(
    rawKey: 'borderColor' | 'backgroundColor',
    tokenKey: 'borderColorToken' | 'backgroundColorToken',
    hex: string,
  ) {
    const merged: Partial<BlockBorder> = { ...value, [rawKey]: hex }
    delete merged[tokenKey]
    onChange(merged)
  }

  // Reset clears BOTH the raw hex AND the token for that slot (no border / no bg).
  function clearColor(
    rawKey: 'borderColor' | 'backgroundColor',
    tokenKey: 'borderColorToken' | 'backgroundColorToken',
  ) {
    const merged: Partial<BlockBorder> = { ...value }
    delete merged[rawKey]
    delete merged[tokenKey]
    onChange(merged)
  }

  const hasBorderColor =
    (typeof value.borderColor === 'string' && value.borderColor.length > 0) ||
    Boolean(value.borderColorToken)
  const hasBg =
    (typeof value.backgroundColor === 'string' && value.backgroundColor.length > 0) ||
    Boolean(value.backgroundColorToken)

  const activeRadius = (value.borderRadius ?? defaults.borderRadius ?? 'none') as BorderRadiusKey

  const borderRadiusOptions: ReadonlyArray<{ value: BorderRadiusKey; label: string }> = [
    { value: 'none', label: messages.email.inspectorBorderRadiusNone },
    { value: 'soft', label: messages.email.inspectorBorderRadiusSoft },
    { value: 'pill', label: messages.email.inspectorBorderRadiusPill },
  ]

  return (
    <div className="space-y-3">
      {/* Border color — opcjonalne, gdy ustawione renderer rysuje 1px solid */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label htmlFor={borderColorId} className="text-xs font-medium text-muted-foreground">
            {messages.email.inspectorBorderColor}
          </Label>
          {hasBorderColor ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => clearColor('borderColor', 'borderColorToken')}
              aria-label={messages.email.inspectorBorderColorReset}
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          ) : null}
        </div>
        <ThemeTokenSelect
          label={messages.email.inspectorColorSourceToken}
          value={value.borderColorToken}
          onChange={(token) => selectToken('borderColorToken', 'borderColor', token)}
        />
        {value.borderColorToken ? null : (
          <ColorPicker
            id={borderColorId}
            label={messages.email.inspectorBorderColor}
            value={value.borderColor ?? ''}
            onChange={(next) => setCustomColor('borderColor', 'borderColorToken', next)}
          />
        )}
      </div>

      <SegmentedControl<BorderRadiusKey>
        label={messages.email.inspectorBorderRadius}
        value={activeRadius}
        options={borderRadiusOptions}
        onChange={(next) => update('borderRadius', next)}
      />

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label htmlFor={bgColorId} className="text-xs font-medium text-muted-foreground">
            {messages.email.inspectorBorderBackgroundColor}
          </Label>
          {hasBg ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => clearColor('backgroundColor', 'backgroundColorToken')}
              aria-label={messages.email.inspectorBorderBackgroundColorReset}
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          ) : null}
        </div>
        <ThemeTokenSelect
          label={messages.email.inspectorColorSourceToken}
          value={value.backgroundColorToken}
          onChange={(token) => selectToken('backgroundColorToken', 'backgroundColor', token)}
        />
        {value.backgroundColorToken ? null : (
          <ColorPicker
            id={bgColorId}
            label={messages.email.inspectorBorderBackgroundColor}
            value={value.backgroundColor ?? ''}
            onChange={(next) => setCustomColor('backgroundColor', 'backgroundColorToken', next)}
          />
        )}
      </div>
    </div>
  )
}
