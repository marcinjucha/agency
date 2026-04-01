'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@agency/ui'
import { EXECUTION_STATUS_LABELS } from '../types'
import type { ExecutionStatus } from '../types'
import { messages } from '@/lib/messages'

interface ExecutionFiltersProps {
  workflowId?: string
  status?: ExecutionStatus
  onWorkflowIdChange: (value: string | undefined) => void
  onStatusChange: (value: ExecutionStatus | undefined) => void
  workflows: { id: string; name: string }[]
}

const ALL_WORKFLOWS = '__all__'
const ALL_STATUSES = '__all__'

export function ExecutionFilters({
  workflowId,
  status,
  onWorkflowIdChange,
  onStatusChange,
  workflows,
}: ExecutionFiltersProps) {
  return (
    <div className="flex items-center gap-3">
      {/* Workflow filter */}
      <Select
        value={workflowId ?? ALL_WORKFLOWS}
        onValueChange={(val) =>
          onWorkflowIdChange(val === ALL_WORKFLOWS ? undefined : val)
        }
      >
        <SelectTrigger className="w-48" aria-label={messages.workflows.filterByWorkflow}>
          <SelectValue placeholder={messages.workflows.filterAllWorkflows} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_WORKFLOWS}>
            {messages.workflows.filterAllWorkflows}
          </SelectItem>
          {workflows.map((wf) => (
            <SelectItem key={wf.id} value={wf.id}>
              {wf.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status filter */}
      <Select
        value={status ?? ALL_STATUSES}
        onValueChange={(val) =>
          onStatusChange(val === ALL_STATUSES ? undefined : (val as ExecutionStatus))
        }
      >
        <SelectTrigger className="w-48" aria-label={messages.workflows.filterByStatus}>
          <SelectValue placeholder={messages.workflows.filterAllStatuses} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_STATUSES}>
            {messages.workflows.filterAllStatuses}
          </SelectItem>
          {(Object.entries(EXECUTION_STATUS_LABELS) as [ExecutionStatus, string][]).map(
            ([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            )
          )}
        </SelectContent>
      </Select>
    </div>
  )
}
