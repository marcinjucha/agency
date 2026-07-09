// ---------------------------------------------------------------------------
// Venture bonus-funnel — shared RFC 5322 "From" header formatter.
//
// Both mail providers (Resend, Gmail SMTP) format the sender the same way:
// an optional friendly display name wraps the address as `"Name" <email>`;
// an absent/blank name falls back to the bare address. Extracted here so the
// two adapters don't each hand-roll the same trim + template logic.
// ---------------------------------------------------------------------------

export function formatFromHeader(name: string | null | undefined, email: string): string {
  const trimmedName = name?.trim()
  return trimmedName ? `"${trimmedName}" <${email}>` : email
}
