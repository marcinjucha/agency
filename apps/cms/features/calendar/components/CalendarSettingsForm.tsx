'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { Button, Card, Input, Label, LoadingState } from '@agency/ui'
import { Loader2 } from 'lucide-react'
import { getCalendarSettings } from '../queries'
import { updateCalendarSettings } from '../actions'
import { calendarSettingsSchema, type CalendarSettingsSchema } from '../validation'
import { useState } from 'react'
import { messages } from '@/lib/messages'

export function CalendarSettingsForm() {
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const { data, isLoading, error } = useQuery({
    queryKey: ['calendarSettings'],
    queryFn: getCalendarSettings,
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CalendarSettingsSchema>({
    resolver: zodResolver(calendarSettingsSchema),
  })

  useEffect(() => {
    if (data) reset(data)
  }, [data, reset])

  async function onSubmit(values: CalendarSettingsSchema) {
    setSaveState('saving')
    try {
      const result = await updateCalendarSettings(values)
      setSaveState(result.success ? 'saved' : 'error')
    } catch {
      setSaveState('error')
    } finally {
      setTimeout(() => setSaveState('idle'), 2500)
    }
  }

  const saveLabel = {
    idle: messages.calendar.saveSettings,
    saving: messages.common.saving,
    saved: messages.common.saved,
    error: messages.common.saveError,
  }[saveState]

  if (isLoading) {
    return <LoadingState variant="skeleton-card" rows={1} />
  }

  if (error) {
    return (
      <Card className="p-6">
        <p className="text-destructive text-sm">{messages.calendar.loadSettingsFailed}</p>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold">{messages.calendar.workHoursTitle}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {messages.calendar.workHoursDescription}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* work_start_hour */}
          <div className="space-y-1.5">
            <Label htmlFor="work_start_hour">{messages.calendar.workStartHour}</Label>
            <Input
              id="work_start_hour"
              type="number"
              min={0}
              max={23}
              aria-invalid={!!errors.work_start_hour}
              aria-describedby={errors.work_start_hour ? 'work_start_hour-error' : undefined}
              {...register('work_start_hour', { valueAsNumber: true })}
            />
            {errors.work_start_hour && (
              <p id="work_start_hour-error" role="alert" className="text-sm text-destructive">
                {errors.work_start_hour.message}
              </p>
            )}
          </div>

          {/* work_end_hour */}
          <div className="space-y-1.5">
            <Label htmlFor="work_end_hour">{messages.calendar.workEndHour}</Label>
            <Input
              id="work_end_hour"
              type="number"
              min={0}
              max={23}
              aria-invalid={!!errors.work_end_hour}
              aria-describedby={errors.work_end_hour ? 'work_end_hour-error' : undefined}
              {...register('work_end_hour', { valueAsNumber: true })}
            />
            {errors.work_end_hour && (
              <p id="work_end_hour-error" role="alert" className="text-sm text-destructive">
                {errors.work_end_hour.message}
              </p>
            )}
          </div>

          {/* slot_duration_minutes */}
          <div className="space-y-1.5">
            <Label htmlFor="slot_duration_minutes">{messages.calendar.slotDuration}</Label>
            <Input
              id="slot_duration_minutes"
              type="number"
              min={15}
              max={480}
              aria-invalid={!!errors.slot_duration_minutes}
              aria-describedby={
                errors.slot_duration_minutes ? 'slot_duration_minutes-error' : undefined
              }
              {...register('slot_duration_minutes', { valueAsNumber: true })}
            />
            {errors.slot_duration_minutes && (
              <p id="slot_duration_minutes-error" role="alert" className="text-sm text-destructive">
                {errors.slot_duration_minutes.message}
              </p>
            )}
          </div>

          {/* buffer_minutes */}
          <div className="space-y-1.5">
            <Label htmlFor="buffer_minutes">{messages.calendar.bufferMinutes}</Label>
            <Input
              id="buffer_minutes"
              type="number"
              min={0}
              max={120}
              aria-invalid={!!errors.buffer_minutes}
              aria-describedby={errors.buffer_minutes ? 'buffer_minutes-error' : undefined}
              {...register('buffer_minutes', { valueAsNumber: true })}
            />
            {errors.buffer_minutes && (
              <p id="buffer_minutes-error" role="alert" className="text-sm text-destructive">
                {errors.buffer_minutes.message}
              </p>
            )}
          </div>
        </div>

        <Button type="submit" disabled={saveState === 'saving'} className="w-full sm:w-auto">
          {saveState === 'saving' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {saveLabel}
        </Button>
      </form>
    </Card>
  )
}
