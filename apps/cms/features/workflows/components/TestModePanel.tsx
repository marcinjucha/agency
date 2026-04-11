'use client'

import { useState, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Button,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@agency/ui'
import { Play, X, ChevronDown, ChevronRight, Loader2, ExternalLink } from 'lucide-react'
import { messages } from '@/lib/messages'
import { queryKeys } from '@/lib/query-keys'
import { routes } from '@/lib/routes'
import { TRIGGER_VARIABLE_SCHEMAS } from '@/lib/trigger-schemas'
import { getWorkflowExecutions, getExecutionWithSteps } from '../queries'
import { EXECUTION_STATUS_LABELS } from '../types'

export type StepTestResult = {
  stepId: string
  stepName: string
  stepType: string
  status: 'completed' | 'failed' | 'skipped' | 'pending'
  inputPayload?: Record<string, unknown>
  outputPayload?: Record<string, unknown>
  errorMessage?: string
}

interface TestModePanelProps {
  workflowId: string
  triggerType: string
  onClose: () => void
  onExecutionResult: (stepResults: StepTestResult[]) => void
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
  skipped: 'bg-muted text-muted-foreground border-border',
  pending: 'bg-muted text-muted-foreground border-border',
}

const STATUS_DOT: Record<string, string> = {
  completed: 'bg-emerald-500',
  failed: 'bg-red-500',
  skipped: 'bg-muted-foreground',
  pending: 'bg-muted-foreground',
}

export function TestModePanel({
  workflowId,
  triggerType,
  onClose,
  onExecutionResult,
}: TestModePanelProps) {
  const initialJson = useMemo(
    () => JSON.stringify(generateMockData(triggerType), null, 2),
    [triggerType]
  )

  const [jsonText, setJsonText] = useState(initialJson)
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)
  const [stepResults, setStepResults] = useState<StepTestResult[]>([])
  const [expandedStep, setExpandedStep] = useState<string | null>(null)
  const [executionStatus, setExecutionStatus] = useState<string | null>(null)
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null)
  const [lastDryRunSourceId, setLastDryRunSourceId] = useState<string | null>(null)

  // Fetch recent real executions (exclude dry-runs) for "Z wykonania" tab
  const { data: recentExecutions } = useQuery({
    queryKey: [...queryKeys.workflows.all, workflowId, 'executions-for-test'],
    queryFn: () => getWorkflowExecutions(workflowId, { limit: 10, excludeDryRuns: true }),
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
      setLastDryRunSourceId(executionId)
      try {
        const execution = await getExecutionWithSteps(executionId)
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

  const handleRunTest = useCallback(async () => {
    // Full workflow dry-run was removed during CMS execution cleanup (AAA-T-183).
    // Workflow execution is now handled entirely by n8n Orchestrator.
    // Per-step testing via dryRunSingleStep still works.
    setRunError('Pełne testowanie workflow jest tymczasowo niedostępne. Użyj testowania per-krok.')
  }, [])

  const toggleStep = useCallback((stepId: string) => {
    setExpandedStep((prev) => (prev === stepId ? null : stepId))
  }, [])

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
                    {recentExecutions.map((exec) => (
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

          {/* Run button */}
          <Button
            className="w-full"
            onClick={handleRunTest}
            disabled={isRunning || !!jsonError}
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {messages.workflows.testMode.running}
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                {messages.workflows.testMode.runTest}
              </>
            )}
          </Button>

          {/* Run error */}
          {runError && (
            <div className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2">
              <p className="text-sm text-destructive">{runError}</p>
            </div>
          )}

          {/* Results */}
          {executionStatus && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={
                    executionStatus === 'completed'
                      ? STATUS_STYLES.completed
                      : STATUS_STYLES.failed
                  }
                >
                  {executionStatus === 'completed'
                    ? messages.workflows.testMode.testCompleted
                    : messages.workflows.testMode.testFailed}
                </Badge>
              </div>

              {/* Comparison hint when replaying from execution */}
              {lastDryRunSourceId && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{messages.workflows.testMode.comparisonHint}</span>
                  <a
                    href={routes.admin.execution(lastDryRunSourceId)}
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {messages.workflows.testMode.openExecution}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              {/* Step results list */}
              <div className="space-y-1">
                {stepResults.map((step) => (
                  <div key={step.stepId} className="rounded-md border border-border">
                    <button
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors"
                      onClick={() => toggleStep(step.stepId)}
                    >
                      {expandedStep === step.stepId ? (
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      )}
                      <span
                        className={`h-2 w-2 rounded-full shrink-0 ${STATUS_DOT[step.status]}`}
                      />
                      <span className="text-sm text-foreground flex-1 truncate">
                        {step.stepName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {messages.workflows[`stepExecution${capitalize(step.status)}` as keyof typeof messages.workflows] as string}
                      </span>
                    </button>

                    {expandedStep === step.stepId && (
                      <div className="px-3 pb-3 space-y-3 border-t border-border pt-3">
                        {step.errorMessage && (
                          <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
                            <p className="text-xs text-destructive font-mono">
                              {step.errorMessage}
                            </p>
                          </div>
                        )}
                        {step.inputPayload && Object.keys(step.inputPayload).length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">
                              {messages.workflows.testMode.stepInput}
                            </p>
                            <pre className="text-xs font-mono bg-muted rounded-md px-3 py-2 overflow-x-auto text-foreground">
                              {JSON.stringify(step.inputPayload, null, 2)}
                            </pre>
                          </div>
                        )}
                        {step.outputPayload && Object.keys(step.outputPayload).length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">
                              {messages.workflows.testMode.stepOutput}
                            </p>
                            <pre className="text-xs font-mono bg-muted rounded-md px-3 py-2 overflow-x-auto text-foreground">
                              {JSON.stringify(step.outputPayload, null, 2)}
                            </pre>
                          </div>
                        )}
                        {!step.inputPayload && !step.outputPayload && !step.errorMessage && (
                          <p className="text-xs text-muted-foreground">
                            {messages.workflows.stepNoPayload}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function formatExecutionStatus(status: string): string {
  return (EXECUTION_STATUS_LABELS as Record<string, string>)[status] ?? status
}
