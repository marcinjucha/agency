

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Button,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@agency/ui'
import { Play, X, Loader2 } from 'lucide-react'
import { messages } from '@/lib/messages'
import { queryKeys } from '@/lib/query-keys'
import { TRIGGER_VARIABLE_SCHEMAS } from '@/lib/trigger-schemas'
import { getWorkflowExecutionsFn, getExecutionWithStepsFn } from '../server'
import { testWorkflowFn } from '../server'
import { EXECUTION_STATUS_LABELS, type WorkflowExecution } from '../types'

interface TestModePanelProps {
  workflowId: string
  triggerType: string
  isActive: boolean
  onClose: () => void
  /**
   * Pre-fill the mock JSON editor on mount or whenever the parent supplies a
   * new defined value (e.g. user clicked "Kopiuj payload" in execution-history
   * detail view). Reset back to `undefined` does NOT wipe the editor — that
   * would clobber user edits if the parent clears its prefill state.
   * Optional — backward-compatible with callers that don't pass it.
   */
  initialJson?: string
  /**
   * Notify the parent after a successful test dispatch so it can swap to the
   * history panel and deep-link to the new execution. Fire-and-forget — this
   * component does NOT continue to interact after the callback (parent
   * unmounts us when it switches panels). Optional — backward-compatible.
   */
  onRequestOpenHistory?: (executionId: string) => void
}

function generateMockData(triggerType: string): Record<string, unknown> {
  const variables = TRIGGER_VARIABLE_SCHEMAS[triggerType]
  if (!variables?.length) return {}
  const mock: Record<string, unknown> = {}
  for (const v of variables) {
    mock[v.key] = v.example ?? v.key
  }
  return mock
}

const STATUS_STYLES: Record<string, string> = {
  completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  failed: 'bg-red-500/10 text-red-400 border-red-500/20',
  running: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  paused: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  skipped: 'bg-muted text-muted-foreground border-border',
  pending: 'bg-muted text-muted-foreground border-border',
}

export function TestModePanel({
  workflowId,
  triggerType,
  isActive,
  onClose,
  initialJson,
  onRequestOpenHistory,
}: TestModePanelProps) {
  const queryClient = useQueryClient()
  const generatedMockJson = useMemo(
    () => JSON.stringify(generateMockData(triggerType), null, 2),
    [triggerType]
  )

  // Initial editor value: explicit prefill from parent (history copy) wins,
  // otherwise fall back to the generated mock for this trigger type.
  const [jsonText, setJsonText] = useState(initialJson ?? generatedMockJson)
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [runResult, setRunResult] = useState<{ success: boolean; executionId?: string; error?: string } | null>(null)

  // React to parent-supplied prefill changes AFTER mount (e.g. user clicks
  // "Kopiuj payload" again on a different execution while the test panel is
  // already open). Only applies when prefill becomes a defined string —
  // transitioning back to undefined would wipe user edits. Trade-off: copy
  // payload from a different execution clobbers in-progress edits — that's
  // the explicit user action, so clobbering is correct.
  useEffect(() => {
    if (initialJson !== undefined) {
      setJsonText(initialJson)
      setJsonError(null)
    }
  }, [initialJson])

  // Fetch recent executions for "Z wykonania" tab
  const { data: recentExecutions } = useQuery({
    queryKey: [...queryKeys.workflows.all, workflowId, 'executions-for-test'],
    queryFn: () =>
      getWorkflowExecutionsFn({
        data: { workflowId, options: { limit: 10, excludeDryRuns: true } },
      }),
  })

  const handleJsonChange = useCallback((value: string) => {
    setJsonText(value)
    try {
      JSON.parse(value)
      setJsonError(null)
    } catch {
      setJsonError(messages.workflows.testMode.invalidJson)
    }
  }, [])

  const handleSelectExecution = useCallback(
    async (executionId: string) => {
      setSelectedExecutionId(executionId)
      try {
        const execution = await getExecutionWithStepsFn({ data: { executionId } })
        if (execution?.trigger_payload) {
          const formatted = JSON.stringify(execution.trigger_payload, null, 2)
          setJsonText(formatted)
          setJsonError(null)
        }
      } catch {
        // Silently fail — user can still edit JSON manually
      }
    },
    []
  )

  async function handleRunWorkflow() {
    let payload: Record<string, unknown>
    try {
      payload = JSON.parse(jsonText)
    } catch {
      setJsonError(messages.workflows.testMode.invalidJson)
      return
    }

    setIsRunning(true)
    setRunResult(null)

    const result = await testWorkflowFn({ data: { workflowId, triggerPayload: payload } })
    setIsRunning(false)

    if (result.success) {
      setRunResult({ success: true, executionId: result.executionId })
      // Refresh executions list so the new one appears
      queryClient.invalidateQueries({
        queryKey: [...queryKeys.workflows.all, workflowId],
      })
      // Hand off to the history panel if the parent wired the callback AND
      // the server actually returned an executionId. Guard against undefined:
      // the server fn return type marks executionId optional, and a `success:
      // true` with no id should not deep-link to an unknown row.
      // Fire-and-forget — parent unmounts this panel by swapping right-panel
      // state, so DO NOT touch local state below this line.
      if (onRequestOpenHistory && result.executionId) {
        onRequestOpenHistory(result.executionId)
      }
    } else {
      setRunResult({ success: false, error: result.error })
    }
  }

  return (
    <div
      className="w-[560px] min-w-[560px] h-full flex flex-col bg-background border-l border-border animate-in slide-in-from-right-4 duration-200"
      role="complementary"
      aria-label={messages.workflows.testMode.title}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">
            {messages.workflows.testMode.title}
          </h2>
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

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-6 space-y-6">
          {/* Source selector */}
          <Tabs defaultValue="mock">
            <TabsList className="w-full">
              <TabsTrigger value="mock" className="flex-1">
                {messages.workflows.testMode.mockData}
              </TabsTrigger>
              <TabsTrigger value="execution" className="flex-1">
                {messages.workflows.testMode.fromExecution}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="mock" className="mt-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  {messages.workflows.testMode.mockData}
                </label>
                <textarea
                  className="w-full h-48 rounded-md border border-input bg-muted px-3 py-2 text-xs font-mono text-foreground resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={jsonText}
                  onChange={(e) => handleJsonChange(e.target.value)}
                  spellCheck={false}
                />
                {jsonError && (
                  <p className="text-xs text-destructive" role="alert">
                    {jsonError}
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="execution" className="mt-4">
              <div className="space-y-4">
                {recentExecutions?.length ? (
                  <div className="space-y-2">
                    {(recentExecutions as WorkflowExecution[]).map((exec) => (
                      <button
                        key={exec.id}
                        className={`w-full text-left px-3 py-2 rounded-md border transition-colors text-sm ${
                          selectedExecutionId === exec.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border bg-card hover:bg-muted'
                        }`}
                        onClick={() => handleSelectExecution(exec.id)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-foreground text-xs">
                            {new Date(exec.created_at).toLocaleString('pl-PL', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-xs ${STATUS_STYLES[exec.status] ?? ''}`}
                          >
                            {formatExecutionStatus(exec.status)}
                          </Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {messages.workflows.testMode.noExecutions}
                  </p>
                )}

                {/* Show JSON editor in execution tab too */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    {messages.workflows.testMode.mockData}
                  </label>
                  <textarea
                    className="w-full h-48 rounded-md border border-input bg-muted px-3 py-2 text-xs font-mono text-foreground resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={jsonText}
                    onChange={(e) => handleJsonChange(e.target.value)}
                    spellCheck={false}
                  />
                  {jsonError && (
                    <p className="text-xs text-destructive" role="alert">
                      {jsonError}
                    </p>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Run workflow button */}
          <div className="space-y-2">
            {!isActive && (
              <p className="text-xs text-muted-foreground" role="status">
                {messages.workflows.testMode.inactiveNote}
              </p>
            )}
            <Button
              className="w-full gap-2"
              onClick={handleRunWorkflow}
              disabled={isRunning || !!jsonError || !isActive}
            >
              {isRunning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {isRunning ? messages.workflows.testMode.running : messages.workflows.testMode.runTest}
            </Button>
          </div>

          {/* Run result */}
          {runResult && (
            <div className={`rounded-md border p-3 text-sm ${
              runResult.success
                ? 'border-emerald-500/20 bg-emerald-500/10'
                : 'border-destructive/20 bg-destructive/10'
            }`}>
              <p className="font-medium">
                {runResult.success
                  ? messages.workflows.testMode.testCompleted
                  : messages.workflows.testMode.testFailed}
              </p>
              {runResult.error && (
                <p className="text-xs text-muted-foreground mt-1">{runResult.error}</p>
              )}
              {runResult.executionId && (
                <p className="text-xs text-muted-foreground mt-1">
                  {messages.workflows.testMode.executionId}: {runResult.executionId}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function formatExecutionStatus(status: string): string {
  return (EXECUTION_STATUS_LABELS as Record<string, string>)[status] ?? status
}
