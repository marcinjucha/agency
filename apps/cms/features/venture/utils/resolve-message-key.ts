import { messages } from '@/lib/messages'

/**
 * Resolve a dotted `messages` bridge key (e.g. "venture.tallySecretLabel") to
 * its string. Falls back to the raw key so a mis-wired descriptor is visible in
 * the UI rather than crashing.
 *
 * Pure + client-safe (imports only the static `@/lib/messages` object). Shared
 * by the venture campaign editor and the generic lead-source config renderer —
 * both bridge a labelKey descriptor to a display string.
 */
export function resolveMessageKey(key: string): string {
  const value = key
    .split('.')
    .reduce<unknown>(
      (acc, part) =>
        acc && typeof acc === 'object'
          ? (acc as Record<string, unknown>)[part]
          : undefined,
      messages,
    )
  return typeof value === 'string' ? value : key
}
