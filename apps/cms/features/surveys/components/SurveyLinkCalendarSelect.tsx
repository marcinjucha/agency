'use client'

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
import { getCalendarConnections, updateSurveyLinkCalendar } from '@/features/calendar/actions'
import type { CalendarConnection } from '@/features/calendar/types'

type SurveyLinkCalendarSelectProps = {
  surveyLinkId: string
  currentConnectionId: string | null
}

function ProviderIcon({ provider }: { provider: CalendarConnection['provider'] }) {
  const className = 'h-3.5 w-3.5 text-muted-foreground shrink-0'
  if (provider === 'google') {
    return <Mail className={className} aria-hidden="true" />
  }
  return <Globe className={className} aria-hidden="true" />
}

const NONE_VALUE = '__none__'

export function SurveyLinkCalendarSelect({
  surveyLinkId,
  currentConnectionId,
}: SurveyLinkCalendarSelectProps) {
  const queryClient = useQueryClient()

  const { data: connections, isLoading } = useQuery({
    queryKey: queryKeys.calendar.connections,
    queryFn: async () => {
      const result = await getCalendarConnections()
      if (!result.success) throw new Error(result.error)
      return result.data
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (connectionId: string | null) => {
      const result = await updateSurveyLinkCalendar(surveyLinkId, connectionId)
      if (!result.success) throw new Error(result.error)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.surveys.all })
    },
  })

  const activeConnections = (connections ?? []).filter((c) => c.isActive)
  const selectValue = currentConnectionId ?? NONE_VALUE

  function handleValueChange(value: string) {
    const connectionId = value === NONE_VALUE ? null : value
    updateMutation.mutate(connectionId)
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={`calendar-select-${surveyLinkId}`}>
        {messages.calendar.calendarSelectLabel}
      </Label>
      <Select
        value={selectValue}
        onValueChange={handleValueChange}
        disabled={isLoading || updateMutation.isPending}
      >
        <SelectTrigger id={`calendar-select-${surveyLinkId}`}>
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

      {updateMutation.error && (
        <p className="text-xs text-destructive" role="alert">
          {updateMutation.error instanceof Error
            ? updateMutation.error.message
            : messages.common.unknownError}
        </p>
      )}
    </div>
  )
}
