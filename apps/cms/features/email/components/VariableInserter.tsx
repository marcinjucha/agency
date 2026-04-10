'use client'

import { type RefObject } from 'react'
import { Button, VariableInserterPopover, type VariableItem } from '@agency/ui'
import { Braces } from 'lucide-react'
import { useVariableInserter } from '@/hooks/use-variable-inserter'
import { messages } from '@/lib/messages'

interface VariableInserterProps {
  variables: VariableItem[]
  inputRef: RefObject<HTMLInputElement | HTMLTextAreaElement | null>
  onChange: (value: string) => void
  currentValue: string
}

export function VariableInserter({
  variables,
  inputRef,
  onChange,
  currentValue,
}: VariableInserterProps) {
  const { insertVariable } = useVariableInserter(inputRef, onChange, currentValue)

  if (variables.length === 0) return null

  return (
    <VariableInserterPopover
      variables={variables}
      onInsert={insertVariable}
      searchPlaceholder={messages.variableInserter.searchPlaceholder}
      emptyMessage={messages.variableInserter.noVariables}
      trigger={
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground text-xs"
          aria-label={messages.variableInserter.insertVariable}
        >
          <Braces className="h-3 w-3 mr-1" />
          {messages.variableInserter.label}
        </Button>
      }
    />
  )
}
