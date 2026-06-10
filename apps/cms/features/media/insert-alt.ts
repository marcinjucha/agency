// alt is never empty: library alt_text wins, filename is the last-resort fallback
export function resolveInsertAlt(item: { name: string; alt_text?: string | null }): string {
  return item.alt_text?.trim() || item.name
}
