import { Button } from '@agency/ui'
import { X } from 'lucide-react'
import { messages } from '@/lib/messages'
import { useDocumentVisible } from '../hooks/use-document-visible'
import { ExecutionHistoryDetailView } from './ExecutionHistoryDetailView'
import { ExecutionHistoryListView } from './ExecutionHistoryListView'

// --- Props ---

interface ExecutionHistoryPanelProps {
  workflowId: string
  /** `undefined` → list view; uuid → detail view. */
  executionId: string | undefined
  /** Navigate between list ↔ detail. Pass `undefined` to go back to list. */
  onExecutionChange: (executionId: string | undefined) => void
  /** Close the entire panel (parent unmounts). */
  onClose: () => void
  /** Bidirectional callback — wired in Iter 4 to TestModePanel.initialJson. */
  onCopyPayloadToTest: (payload: Record<string, unknown>) => void
}

// --- Main panel ---

export function ExecutionHistoryPanel({
  workflowId,
  executionId,
  onExecutionChange,
  onClose,
  onCopyPayloadToTest,
}: ExecutionHistoryPanelProps) {
  // Polling gate: only when the tab is visible. Panel-open is implicit via
  // mount (parent unmounts the panel on close). Tab-hidden gate is a Boy Scout
  // layer that pauses polling when the user switches tabs. Future
  // "panel-open-but-not-focused" semantics extend here.
  const documentVisible = useDocumentVisible()
  const polling = documentVisible

  const isDetail = executionId !== undefined

  return (
    <div
      className="w-[560px] min-w-[560px] h-full flex flex-col bg-background border-l border-border animate-in slide-in-from-right-4 duration-200"
      role="complementary"
      aria-label={messages.workflows.executionHistory.panelTitle}
    >
      {/* Top header — title + close. Sticky to the panel top, never scrolls. */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-2.5 flex items-center justify-between">
        <h2 className="text-sm font-medium text-foreground">
          {messages.workflows.executionHistory.panelTitle}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={onClose}
          aria-label={messages.workflows.executionHistory.panelClose}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      {/* Body — view-state machine with fade-in remount on view change.
          `flex-1 min-h-0` is critical so inner views can scroll while the
          header above stays sticky. */}
      <div
        key={executionId ?? '__list__'}
        className="animate-in fade-in duration-150 flex-1 min-h-0"
      >
        {isDetail ? (
          <ExecutionHistoryDetailView
            executionId={executionId}
            pollingEnabled={polling}
            onBack={() => onExecutionChange(undefined)}
            onCopyPayloadToTest={onCopyPayloadToTest}
          />
        ) : (
          <ExecutionHistoryListView
            workflowId={workflowId}
            pollingEnabled={polling}
            onSelectExecution={onExecutionChange}
          />
        )}
      </div>
    </div>
  )
}
