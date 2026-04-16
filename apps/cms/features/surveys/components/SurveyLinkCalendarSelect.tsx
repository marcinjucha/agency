import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@agency/ui'
import { Globe, Mail } from 'lucide-react'
import { queryKeys } from '@/lib/query-keys'
import { messages } from '@/lib/messages'
import { getCalendarConnectionsFn, updateSurveyLinkCalendarFn } from '@/features/calendar/server'
import type { CalendarConnection } from '@/features/calendar/types'

/**
 * Auto-save mode: saves to DB immediately on change (standalone usage).
 * Controlled mode: tracks value via onChange callback (embedded in forms).
 */
type AutoSaveProps = {
  mode?: 'auto-save'
  surveyLinkId: string
  currentConnectionId: string | null
  onChange?: never
  value?: never
}

type ControlledProps = {
  mode: 'controlled'
  surveyLinkId?: never
  currentConnectionId?: never
  onChange: (connectionId: string | null) => void
  value: string | null
}

type SurveyLinkCalendarSelectProps = AutoSaveProps | ControlledProps

function ProviderIcon({ provider }: { provider: CalendarConnection['provider'] }) {
  const className = 'h-3.5 w-3.5 text-muted-foreground shrink-0'
  if (provider === 'google') {
    return <Mail className={className} aria-hidden="true" />
  }
  return <Globe className={className} aria-hidden="true" />
}

const NONE_VALUE = '__none__'

export function SurveyLinkCalendarSelect(props: SurveyLinkCalendarSelectProps) {
  const queryClient = useQueryClient()
  const isControlled = props.mode === 'controlled'

  const { data: connections, isLoading } = useQuery({
    queryKey: queryKeys.calendar.connections,
    queryFn: async () => {
      const result = await getCalendarConnectionsFn()
      if (!result.success) throw new Error(result.error)
      return result.data
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (connectionId: string | null) => {
      if (isControlled) throw new Error('Cannot auto-save in controlled mode')
      const result = await updateSurveyLinkCalendarFn({ data: { surveyLinkId: props.surveyLinkId, connectionId } })
      if (!result.success) throw new Error(result.error)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.surveys.all })
    },
  })

  const activeConnections = (connections ?? []).filter((c) => c.isActive)
  const currentValue = isControlled ? props.value : props.currentConnectionId
  const selectValue = currentValue ?? NONE_VALUE

  function handleValueChange(value: string) {
    const connectionId = value === NONE_VALUE ? null : value
    if (isControlled) {
      props.onChange(connectionId)
    } else {
      updateMutation.mutate(connectionId)
    }
  }

  const selectId = isControlled ? 'calendar-select-controlled' : `calendar-select-${props.surveyLinkId}`

  return (
    <div className="space-y-1.5">
      <Label htmlFor={selectId}>
        {messages.calendar.calendarSelectLabel}
      </Label>
      <Select
        value={selectValue}
        onValueChange={handleValueChange}
        disabled={isLoading || updateMutation.isPending}
      >
        <SelectTrigger id={selectId}>
          <SelectValue placeholder={messages.calendar.calendarSelectPlaceholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE_VALUE}>
            {messages.calendar.calendarSelectNone}
          </SelectItem>
          {activeConnections.map((connection) => (
            <SelectItem key={connection.id} value={connection.id}>
              <span className="flex items-center gap-2">
                <ProviderIcon provider={connection.provider} />
                <span>{connection.displayName}</span>
                {connection.isDefault && (
                  <span className="text-xs text-muted-foreground">
                    ({messages.calendar.statusDefault})
                  </span>
                )}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {!isControlled && updateMutation.error && (
        <p className="text-xs text-destructive" role="alert">
          {updateMutation.error instanceof Error
            ? updateMutation.error.message
            : messages.common.unknownError}
        </p>
      )}
    </div>
  )
}

/**
 * Get display name for a calendar connection ID.
 * Returns null if connections not loaded or ID not found.
 */
export function useCalendarConnectionName(connectionId: string | null): string | null {
  const { data: connections } = useQuery({
    queryKey: queryKeys.calendar.connections,
    queryFn: async () => {
      const result = await getCalendarConnectionsFn()
      if (!result.success) throw new Error(result.error)
      return result.data
    },
    enabled: connectionId !== null,
  })

  if (!connectionId || !connections) return null
  const connection = connections.find((c) => c.id === connectionId)
  return connection?.displayName ?? null
}
