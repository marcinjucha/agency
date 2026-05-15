import { messages } from '@/lib/messages'
import type { TemplateVariable } from '../types'

/**
 * Walidacja klucza zmiennej szablonu w VariablesEditor.
 *
 * @param key  — surowy klucz wprowadzany przez usera (manual variable)
 * @param index — pozycja wiersza (do unique check — pomijamy ten sam wiersz)
 * @param variables — pełna lista zmiennych do unique check
 * @returns null gdy klucz prawidłowy (lub pusty — work-in-progress), inaczej user-facing error message
 */
export function validateVariableKey(
  key: string,
  index: number,
  variables: TemplateVariable[]
): string | null {
  if (key.length === 0) return null // empty OK w trakcie edycji
  if (!/^\w{1,100}$/.test(key)) return messages.validation.invalidVariableKey
  const duplicate = variables.some((v, i) => i !== index && v.key === key)
  if (duplicate) return messages.validation.duplicateVariableKey
  return null
}
