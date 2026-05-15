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

  const hasBorderColor = typeof value.borderColor === 'string' && value.borderColor.length > 0
  const hasBg = typeof value.backgroundColor === 'string' && value.backgroundColor.length > 0

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
              onClick={() => update('borderColor', undefined)}
              aria-label={messages.email.inspectorBorderColorReset}
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          ) : null}
        </div>
        <ColorPicker
          id={borderColorId}
          label={messages.email.inspectorBorderColor}
          value={value.borderColor ?? ''}
          onChange={(next) => update('borderColor', next)}
        />
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
              onClick={() => update('backgroundColor', undefined)}
              aria-label={messages.email.inspectorBorderBackgroundColorReset}
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          ) : null}
        </div>
        <ColorPicker
          id={bgColorId}
          label={messages.email.inspectorBorderBackgroundColor}
          value={value.backgroundColor ?? ''}
          onChange={(next) => update('backgroundColor', next)}
        />
      </div>
    </div>
  )
}
