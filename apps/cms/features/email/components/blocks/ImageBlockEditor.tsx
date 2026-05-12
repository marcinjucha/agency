import { useState, useEffect } from 'react'
import { Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Button } from '@agency/ui'
import { ImageIcon } from 'lucide-react'
import { InsertMediaModal } from '@/features/media/components/InsertMediaModal'
import { createMediaProxyEditor } from '@/lib/utils/media-proxy'
import type { ImageBlock, Block } from '../../types'
import type { TriggerVariable } from '@/lib/trigger-schemas'

interface ImageBlockEditorProps {
  block: ImageBlock
  onChange: (updated: Block) => void
  variables?: TriggerVariable[]
}

export function ImageBlockEditor({ block, onChange }: ImageBlockEditorProps) {
  // Lokalny state dla pola width — żeby obsłużyć edge case gdy user czyści pole (backspace).
  // parseInt('') = NaN, więc bez lokalnego state input wizualnie pusty ale state stary.
  const [widthInput, setWidthInput] = useState(String(block.width))
  const [mediaModalOpen, setMediaModalOpen] = useState(false)

  // Sync gdy zewnętrzny block.width zmienia się (np. reset do defaultów)
  useEffect(() => {
    setWidthInput(String(block.width))
  }, [block.width])

  const mediaProxyEditor = createMediaProxyEditor((url) => {
    onChange({ ...block, src: url })
  })

  return (
    <div className="space-y-3">
      {/* URL obrazu */}
      <div>
        <Label htmlFor={`${block.id}-src`} className="mb-1.5 block">URL obrazu</Label>
        <div className="flex gap-2">
          <Input
            id={`${block.id}-src`}
            value={block.src}
            onChange={(e) => onChange({ ...block, src: e.target.value })}
            placeholder="https://example.com/obraz.png"
            type="url"
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setMediaModalOpen(true)}
            className="shrink-0"
          >
            <ImageIcon className="mr-1.5 h-3.5 w-3.5" />
            Biblioteka
          </Button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Wklej bezpośredni link do obrazu lub wybierz z Media Library.
        </p>
      </div>

      {/* Tekst alternatywny */}
      <div>
        <Label htmlFor={`${block.id}-alt`} className="mb-1.5 block">Tekst alternatywny (alt)</Label>
        <Input
          id={`${block.id}-alt`}
          value={block.alt}
          onChange={(e) => onChange({ ...block, alt: e.target.value })}
          placeholder="Opis obrazu dla czytników ekranu"
        />
      </div>

      {/* Szerokość */}
      <div>
        <Label htmlFor={`${block.id}-width`} className="mb-1.5 block">Szerokość (px)</Label>
        <Input
          id={`${block.id}-width`}
          value={widthInput}
          onChange={(e) => {
            setWidthInput(e.target.value)
            const parsed = parseInt(e.target.value, 10)
            if (!isNaN(parsed) && parsed > 0 && parsed <= 2400) {
              onChange({ ...block, width: parsed })
            }
          }}
          onBlur={() => {
            // Revert do aktualnej wartości bloku jeśli wpisano nieprawidłową wartość
            const parsed = parseInt(widthInput, 10)
            if (isNaN(parsed) || parsed <= 0 || parsed > 2400) {
              setWidthInput(String(block.width))
            }
          }}
          type="number"
          min={1}
          max={2400}
          placeholder="600"
        />
      </div>

      {/* Wyrównanie */}
      <div>
        <Label htmlFor={`${block.id}-alignment`} className="mb-1.5 block">Wyrównanie</Label>
        <Select
          value={block.alignment}
          onValueChange={(val) => onChange({ ...block, alignment: val as ImageBlock['alignment'] })}
        >
          <SelectTrigger id={`${block.id}-alignment`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="left">Do lewej</SelectItem>
            <SelectItem value="center">Wyśrodkowane</SelectItem>
            <SelectItem value="right">Do prawej</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Modal wyboru z Media Library */}
      <InsertMediaModal
        editor={mediaProxyEditor as any}
        open={mediaModalOpen}
        onClose={() => setMediaModalOpen(false)}
      />
    </div>
  )
}
