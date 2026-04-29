import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Split, AlertTriangle } from 'lucide-react'
import { messages } from '@/lib/messages'
import { nodeBaseClasses, selectedClasses } from './node-styles'
import type { SwitchBranch, StepConfigSwitch } from '../../types'

// --- Constants ---

/** Header area: icon + title text (px) */
const HEADER_HEIGHT = 56

/** Row height per branch handle + label (px) */
const ROW_HEIGHT = 28

// --- Types ---

export type SwitchNodeData = {
  label: string
  stepType: 'switch'
  stepConfig: StepConfigSwitch
  executionStatus?: 'completed' | 'failed' | 'skipped' | 'pending' | 'running'
  slug?: string
  isInvalid?: boolean
}

// --- Execution ring ---

const EXECUTION_RING: Record<string, string> = {
  completed: 'ring-2 ring-emerald-500/60',
  failed: 'ring-2 ring-red-500/60',
  skipped: 'opacity-40',
}

const INVALID_RING = 'ring-2 ring-amber-500'

// --- Handle color by branch index ---

/**
 * Cycle pattern: index 0 = green, last = red, index 1 = amber, 2 = blue, 3+ cycle amber→blue→purple.
 * Receives absolute branch index and total count to determine first/last.
 */
function handleColorClass(index: number, total: number): string {
  if (index === 0) return '!bg-emerald-500 !border-emerald-600'
  if (index === total - 1) return '!bg-red-400 !border-red-500'
  const cycle = [
    '!bg-amber-500 !border-amber-600',
    '!bg-blue-500 !border-blue-600',
    '!bg-purple-500 !border-purple-600',
  ]
  // Middle branches cycle starting at index 1 (already handled last separately)
  return cycle[(index - 1) % cycle.length]
}

// --- Branch label style ---

function branchLabelClass(branch: SwitchBranch, isLast: boolean): string {
  const base = 'text-xs truncate max-w-[110px] leading-none'
  if (isLast) return `${base} text-muted-foreground/60 italic`
  return `${base} text-muted-foreground`
}

// --- Component ---

function SwitchNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as SwitchNodeData

  const branches: SwitchBranch[] =
    nodeData.stepConfig?.branches ?? [
      { id: 'default', label: 'Pozostałe', expression: 'default' },
    ]

  const total = branches.length
  const minHeight = HEADER_HEIGHT + total * ROW_HEIGHT

  // Invalid takes precedence over selection so users see the validation cue while editing.
  const ring = nodeData.isInvalid
    ? INVALID_RING
    : nodeData.executionStatus
      ? EXECUTION_RING[nodeData.executionStatus] ?? ''
      : selected
        ? selectedClasses
        : ''

  return (
    <div
      className={`${nodeBaseClasses} border-l-4 border-l-amber-400 relative ${ring}`}
      style={{ minHeight, minWidth: 200 }}
      aria-invalid={nodeData.isInvalid ? 'true' : undefined}
    >
      {/* Target handle — left side, vertically centered in header */}
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-muted-foreground !border-border !w-2.5 !h-2.5"
        style={{ top: HEADER_HEIGHT / 2 }}
      />

      {/* Header: icon + step type label + node label */}
      <div className="flex items-center gap-2">
        <Split className="h-4 w-4 text-amber-400 shrink-0" />
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            PRZEŁĄCZNIK
          </p>
          <p className="text-sm font-medium text-foreground truncate">
            {nodeData.label}
          </p>
        </div>
        {nodeData.isInvalid && (
          <AlertTriangle
            className="h-3.5 w-3.5 text-amber-500 shrink-0 ml-auto"
            aria-label={messages.workflows.editor.invalidStepAriaLabel}
          />
        )}
      </div>

      {/* Dynamic source handles + branch labels */}
      {branches.map((branch, index) => {
        const isLast = index === total - 1
        const topPx = HEADER_HEIGHT + (index + 0.5) * ROW_HEIGHT

        return (
          <Handle
            key={branch.id}
            type="source"
            position={Position.Right}
            id={branch.id}
            className={`!w-2.5 !h-2.5 ${handleColorClass(index, total)}`}
            style={{ top: topPx }}
          />
        )
      })}

      {/* Branch labels — positioned absolutely on the right, aligned to each handle */}
      <div
        className="absolute pointer-events-none"
        style={{ right: -8, top: HEADER_HEIGHT, width: 120 }}
      >
        {branches.map((branch, index) => {
          const isLast = index === total - 1
          const topOffsetPx = (index + 0.5) * ROW_HEIGHT - 6 // center label on handle

          return (
            <span
              key={branch.id}
              className={branchLabelClass(branch, isLast)}
              style={{
                position: 'absolute',
                top: topOffsetPx,
                left: 20,
                right: 0,
                display: 'block',
              }}
            >
              {branch.label}
            </span>
          )
        })}
      </div>
    </div>
  )
}

export const SwitchNode = memo(SwitchNodeComponent)
