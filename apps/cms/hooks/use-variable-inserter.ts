import { type RefObject, useCallback } from 'react'

/**
 * Hook for inserting {{variable}} tokens into text inputs at cursor position.
 * Used by email template editor to insert trigger variables.
 */
export function useVariableInserter(
  inputRef: RefObject<HTMLInputElement | HTMLTextAreaElement | null>,
  onChange: (value: string) => void,
  currentValue: string
): { insertVariable: (key: string) => void } {
  const insertVariable = useCallback(
    (key: string) => {
      const token = `{{${key}}}`
      const el = inputRef.current

      if (!el) {
        // No ref — append at end
        onChange(currentValue + token)
        return
      }

      const start = el.selectionStart ?? currentValue.length
      const end = el.selectionEnd ?? currentValue.length

      const before = currentValue.slice(0, start)
      const after = currentValue.slice(end)
      const updated = before + token + after

      onChange(updated)

      // Restore focus and cursor position after React re-render
      const newCursorPos = start + token.length
      setTimeout(() => {
        el.focus()
        el.setSelectionRange(newCursorPos, newCursorPos)
      }, 0)
    },
    [inputRef, onChange, currentValue]
  )

  return { insertVariable }
}
