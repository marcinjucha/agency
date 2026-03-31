'use client'

import { useReactFlow } from '@xyflow/react'
import { Button } from '@agency/ui'
import { Minus, Plus, Maximize2 } from 'lucide-react'
import { messages } from '@/lib/messages'

export function CanvasControls() {
  const { zoomIn, zoomOut, fitView } = useReactFlow()

  return (
    <div className="absolute bottom-4 right-4 z-10 flex items-center gap-1 bg-card/80 backdrop-blur border border-border rounded-lg p-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => zoomOut()}
        aria-label={messages.workflows.editor.zoomOut}
      >
        <Minus className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => zoomIn()}
        aria-label={messages.workflows.editor.zoomIn}
      >
        <Plus className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => fitView({ padding: 0.2 })}
        aria-label={messages.workflows.editor.fitView}
      >
        <Maximize2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
