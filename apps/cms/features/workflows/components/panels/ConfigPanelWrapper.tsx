'use client'

import { useEffect, useRef } from 'react'
import { Button } from '@agency/ui'
import { X } from 'lucide-react'
import { messages } from '@/lib/messages'
import { NODE_TYPE_CONFIGS, TRIGGER_SUBTYPE_CONFIGS } from '../nodes/node-registry'

interface ConfigPanelWrapperProps {
  nodeId: string
  stepType: string
  onClose: () => void
  children: React.ReactNode
}

function getNodeConfig(stepType: string) {
  return (
    TRIGGER_SUBTYPE_CONFIGS[stepType] ??
    NODE_TYPE_CONFIGS[stepType] ??
    NODE_TYPE_CONFIGS['trigger']
  )
}

export function ConfigPanelWrapper({
  nodeId,
  stepType,
  onClose,
  children,
}: ConfigPanelWrapperProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const config = getNodeConfig(stepType)
  const Icon = config.icon

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div
      ref={panelRef}
      className="w-[560px] min-w-[560px] h-full flex flex-col bg-background border-l border-border animate-in slide-in-from-right-4 duration-200"
      role="complementary"
      aria-label={messages.workflows.editor.configPanel}
    >
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`flex items-center justify-center h-8 w-8 rounded-md bg-muted ${config.borderColor}`}>
              <Icon className="h-4 w-4 text-foreground" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-foreground truncate">
                {config.label}
              </h2>
              <p className="text-xs text-muted-foreground truncate">
                {messages.workflows.editor.configPanel}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={onClose}
            aria-label={messages.workflows.editor.configPanelClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {children}
      </div>
    </div>
  )
}
