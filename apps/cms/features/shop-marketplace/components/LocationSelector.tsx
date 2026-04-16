

import { Input, Label } from '@agency/ui'
import { messages } from '@/lib/messages'

interface LocationSelectorProps {
  value?: string
  onChange: (city: string) => void
}

/**
 * Simple city text input for OLX listing location.
 * OLX only — Allegro does not require a city field.
 */
export function LocationSelector({ value, onChange }: LocationSelectorProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor="listing-location" className="text-sm font-medium">
        {messages.marketplace.locationLabel}
      </Label>
      <Input
        id="listing-location"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={messages.marketplace.locationPlaceholder}
        className="text-sm"
        aria-label="Miasto ogłoszenia"
        autoComplete="off"
      />
    </div>
  )
}
