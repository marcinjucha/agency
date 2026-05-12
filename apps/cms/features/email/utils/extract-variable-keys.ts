import type { Block } from '@agency/email'

/**
 * Ekstrahuje unikalne klucze zmiennych {{key}} z subject i bloków emaila.
 * Rekurencyjnie skanuje wszystkie string-owe pola (content, companyName,
 * label, url, text, columns.leftChildren, columns.rightChildren itp.).
 *
 * Czysta funkcja — nie zależy od hooków ani JSX.
 * TDD candidate: apps/cms/features/email/__tests__/extract-variable-keys.test.ts
 */
export function extractTemplateVariableKeys(subject: string, blocks: Block[]): string[] {
  const matches = new Set<string>()
  const VARIABLE_REGEX = /\{\{(\w+)\}\}/g

  function scanString(str: string): void {
    VARIABLE_REGEX.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = VARIABLE_REGEX.exec(str)) !== null) {
      matches.add(m[1])
    }
  }

  function scanValue(value: unknown): void {
    if (typeof value === 'string') {
      scanString(value)
    } else if (Array.isArray(value)) {
      value.forEach(scanValue)
    } else if (value !== null && typeof value === 'object') {
      Object.values(value).forEach(scanValue)
    }
  }

  scanString(subject)
  blocks.forEach(scanValue)

  return Array.from(matches)
}
