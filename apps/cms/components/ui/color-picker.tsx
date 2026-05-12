import { useState } from 'react'
import { HexColorPicker } from 'react-colorful'
import { Popover, PopoverContent, PopoverTrigger } from '@agency/ui'
import { cn } from '@agency/ui'

const PRESET_COLORS = [
  '#0f172a',
  '#1e293b',
  '#334155',
  '#64748b',
  '#94a3b8',
  '#e2e8f0',
  '#f8fafc',
  '#ffffff',
  '#3b82f6',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
]

interface ColorPickerProps {
  value: string
  onChange: (hex: string) => void
  label?: string
  id?: string
  className?: string
}

export function ColorPicker({ value, onChange, label, id, className }: ColorPickerProps) {
  const [open, setOpen] = useState(false)
  const [hexInput, setHexInput] = useState(value.replace('#', ''))

  function handlePickerChange(color: string) {
    onChange(color)
    setHexInput(color.replace('#', ''))
  }

  function handleSwatchClick(color: string) {
    onChange(color)
    setHexInput(color.replace('#', ''))
    setOpen(false)
  }

  function handleHexInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6)
    setHexInput(raw)
    if (raw.length === 6) {
      onChange(`#${raw}`)
    }
  }

  const displayColor = value && /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#000000'

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            id={id}
            aria-label={label ? `Wybierz kolor: ${label}` : 'Wybierz kolor'}
            aria-haspopup="true"
            aria-expanded={open}
            className="h-9 w-9 shrink-0 rounded-md border border-input shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:opacity-90"
            style={{ backgroundColor: displayColor }}
          />
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-3 space-y-3"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {/* HexColorPicker — inline, nie otwiera OS dialog */}
          <HexColorPicker
            color={displayColor}
            onChange={handlePickerChange}
            style={{ width: 200, height: 150 }}
          />

          {/* Preset swatchy 6 kolumn */}
          <div className="grid grid-cols-6 gap-1.5">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Kolor ${color}`}
                onClick={() => handleSwatchClick(color)}
                className={cn(
                  'h-6 w-6 rounded border border-border/50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 hover:scale-110',
                  displayColor.toLowerCase() === color.toLowerCase() &&
                    'ring-2 ring-ring ring-offset-1'
                )}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>

          {/* Hex input */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-mono text-muted-foreground select-none">#</span>
            <input
              type="text"
              value={hexInput}
              onChange={handleHexInputChange}
              maxLength={6}
              spellCheck={false}
              aria-label="Wartość hex koloru"
              placeholder="1a1a2e"
              className="flex h-7 w-full rounded-md border border-input bg-transparent px-2 py-1 text-xs font-mono text-foreground shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        </PopoverContent>
      </Popover>

      {/* Hex value display — klikalny otwiera popover */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-0.5"
        aria-label={`Kolor ${displayColor}, kliknij aby zmienić`}
      >
        {displayColor}
      </button>
    </div>
  )
}
