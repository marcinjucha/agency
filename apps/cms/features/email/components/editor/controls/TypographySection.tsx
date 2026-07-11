import { useId } from 'react'
import { AlignLeft, AlignCenter, AlignRight } from 'lucide-react'
import { Label } from '@agency/ui'
import type { BlockTypography, TypographyDefaults } from '@agency/email'
import { messages } from '@/lib/messages'
import { ColorPicker } from '@/components/ui/color-picker'
import { SegmentedControl } from './SegmentedControl'
import { ThemeTokenSelect } from './ThemeTokenSelect'

/**
 * TypographySection — minimalny edytor tekstu w bloku.
 *
 * Tylko 2 kontrolki:
 *   1. Wyrównanie tekstu (SegmentedControl: lewa / środek / prawa)
 *   2. Kolor tekstu (ColorPicker)
 *
 * Font family / size / weight / line-height / letter-spacing usunięte — nie
 * działały widocznie w canvasie w starym UI i dodawały złożoność bez wartości.
 */
export interface TypographySectionProps {
  value: Partial<BlockTypography>
  defaults: TypographyDefaults
  onChange: (next: Partial<BlockTypography>) => void
}

type TextAlignKey = 'left' | 'center' | 'right'

export function TypographySection({ value, defaults, onChange }: TypographySectionProps) {
  const textColorId = useId()

  function update<K extends keyof BlockTypography>(key: K, next: BlockTypography[K] | undefined) {
    const merged: Partial<BlockTypography> = { ...value }
    if (next === undefined) {
      delete merged[key]
    } else {
      merged[key] = next
    }
    onChange(merged)
  }

  // Token and raw hex are mutually exclusive: picking a token clears the raw
  // textColor; picking a custom hex clears the token. The renderer's ladder
  // (token ref → raw hex → default) would honour token first anyway, but
  // clearing keeps the stored block unambiguous + the UI in sync.
  function selectToken(token: string | undefined) {
    const merged: Partial<BlockTypography> = { ...value }
    if (token === undefined) {
      delete merged.textColorToken
    } else {
      merged.textColorToken = token
      delete merged.textColor
    }
    onChange(merged)
  }

  function setCustomColor(hex: string) {
    const merged: Partial<BlockTypography> = { ...value, textColor: hex }
    delete merged.textColorToken
    onChange(merged)
  }

  const textAlignOptions: ReadonlyArray<{ value: TextAlignKey; label: string; icon: React.ReactNode }> = [
    {
      value: 'left',
      label: messages.email.inspectorTypographyTextAlignLeft,
      icon: <AlignLeft className="h-3.5 w-3.5" />,
    },
    {
      value: 'center',
      label: messages.email.inspectorTypographyTextAlignCenter,
      icon: <AlignCenter className="h-3.5 w-3.5" />,
    },
    {
      value: 'right',
      label: messages.email.inspectorTypographyTextAlignRight,
      icon: <AlignRight className="h-3.5 w-3.5" />,
    },
  ]

  const activeTextAlign = (value.textAlign ?? defaults.textAlign) as TextAlignKey
  const activeTextColor = value.textColor ?? defaults.textColor

  return (
    <div className="space-y-3">
      <SegmentedControl<TextAlignKey>
        label={messages.email.inspectorTypographyTextAlign}
        value={activeTextAlign}
        options={textAlignOptions}
        onChange={(next) => update('textAlign', next)}
      />

      <ThemeTokenSelect
        label={messages.email.inspectorColorSourceToken}
        value={value.textColorToken}
        onChange={selectToken}
      />

      {value.textColorToken ? null : (
        <div className="space-y-1">
          <Label htmlFor={textColorId} className="text-xs font-medium text-muted-foreground">
            {messages.email.inspectorTypographyTextColor}
          </Label>
          <ColorPicker
            id={textColorId}
            label={messages.email.inspectorTypographyTextColor}
            value={activeTextColor}
            onChange={setCustomColor}
          />
        </div>
      )}
    </div>
  )
}
