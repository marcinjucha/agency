import { CMS_BLOCK_REGISTRY, BLOCK_GROUPS } from '../block-registry'
import type { BlockType } from '../types'

interface BlockPaletteProps {
  onAddBlock: (type: BlockType) => void
}

export function BlockPalette({ onAddBlock }: BlockPaletteProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Nagłówek sekcji */}
      <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
        BLOKI
      </p>

      {/* Grupy bloków */}
      {BLOCK_GROUPS.map((group) => {
        if (group.blocks.length === 0) return null

        return (
          <div key={group.id} className="flex flex-col gap-1">
            <p className="text-xs uppercase tracking-wider text-muted-foreground/60 mb-1">
              {group.label}
            </p>

            {group.blocks.map((entry) => {
              const Icon = entry.icon

              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => onAddBlock(entry.id)}
                  aria-label={`Dodaj blok: ${entry.label}`}
                  className="group flex items-start gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40 text-muted-foreground group-hover:border-border/80 group-hover:text-foreground transition-colors">
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-tight text-foreground">
                      {entry.label}
                    </p>
                    <p className="text-xs text-muted-foreground leading-snug mt-0.5 truncate">
                      {entry.description}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
