import { Image } from '@unpic/react'
import { CheckCircle2, AlertTriangle } from 'lucide-react'
import {
  contrastRatio,
  ensureHeaderContrast,
  hexColorSchema,
  HALO_EFEKT_DEFAULT,
  resolveClientTheme,
  THEME_COLOR_TOKEN_KEYS,
  type HexColor,
  type ThemeColorTokenKey,
  type ThemeTokens,
} from '@/lib/theme'
import { messages } from '@/lib/messages'

// ---------------------------------------------------------------------------
// Theme Manager (iter D3a) — live email preview + resolved-swatch grid.
//
// The editor pipes the current form tokens through the SAME resolver the bonus
// email uses (`resolveClientTheme`) so the preview is byte-faithful to what a
// recipient sees. The header pair carries a WCAG contrast badge that doubles as
// a TEXT alternative (WCAG 1.4.1) to the colour-only header preview: it states
// the ratio in text and flags when `ensureHeaderContrast` corrected the text
// colour for readability.
// ---------------------------------------------------------------------------

interface ThemePreviewProps {
  tokens: ThemeTokens
  // When provided, the "Podgląd e-mail" tab renders this node (the REAL rendered
  // email) INSTEAD of the generic token mock. The theme editor omits it (shows the
  // mock); the venture campaign card injects the byte-faithful send render. The
  // contrast badge + resolved-swatch grid stay in both cases.
  emailPreviewSlot?: React.ReactNode
}

function isValidHex(value: unknown): value is HexColor {
  return hexColorSchema.safeParse(value).success
}

export function ThemePreview({ tokens, emailPreviewSlot }: ThemePreviewProps) {
  const resolved = resolveClientTheme({ tenantTheme: null, clientTheme: tokens })

  // The header text the operator INTENDED (before the readability guard). When
  // `ensureHeaderContrast` returns a different value, the guard kicked in.
  const intendedHeaderText = isValidHex(tokens.headerText)
    ? tokens.headerText
    : HALO_EFEKT_DEFAULT.headerText
  const guardedHeaderText = ensureHeaderContrast(
    resolved.headerBackground,
    intendedHeaderText,
  )
  const wasCorrected =
    guardedHeaderText.toLowerCase() !== intendedHeaderText.toLowerCase()
  const finalRatio = contrastRatio(
    resolved.headerBackground,
    resolved.headerText,
  ).toFixed(1)

  const fontFamily = resolved.fontFamily || undefined

  return (
    <div className="space-y-6">
      {/* Tabs — email active, web disabled ("Wkrótce") */}
      <div
        role="tablist"
        aria-label={messages.themes.previewTitle}
        className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1"
      >
        <span
          role="tab"
          aria-selected="true"
          className="rounded-md bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-sm"
        >
          {messages.themes.previewEmailTab}
        </span>
        <span
          role="tab"
          aria-selected="false"
          aria-disabled="true"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground/60"
        >
          {messages.themes.previewWebTab}
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
            {messages.themes.previewWebSoon}
          </span>
        </span>
      </div>

      {/* Contrast badge — text alternative to the colour-only header */}
      <ContrastBadge
        corrected={wasCorrected}
        ratio={finalRatio}
        background={resolved.headerBackground}
        text={resolved.headerText}
      />

      {/* Email preview — REAL rendered email (slot) or the generic token mock */}
      {emailPreviewSlot ?? (
        <div
          className="overflow-hidden rounded-xl border border-border shadow-sm"
          style={{ backgroundColor: resolved.background, fontFamily }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-3 px-6 py-5"
            style={{
              backgroundColor: resolved.headerBackground,
              color: resolved.headerText,
            }}
          >
            {resolved.logoUrl ? (
              <Image
                src={resolved.logoUrl}
                alt={messages.themes.logoAlt}
                layout="constrained"
                width={32}
                height={32}
                className="h-8 w-8 rounded object-contain"
              />
            ) : null}
            <span className="text-base font-semibold" style={{ color: resolved.headerText }}>
              {messages.themes.mockEmailHeading}
            </span>
          </div>

          {/* Body */}
          <div className="space-y-4 px-6 py-6">
            <p className="text-sm leading-relaxed" style={{ color: resolved.text }}>
              {messages.themes.mockEmailBody}
            </p>
            <span
              className="inline-flex items-center rounded-md px-4 py-2 text-sm font-semibold"
              style={{
                backgroundColor: resolved.primary,
                color: resolved.primaryText,
              }}
            >
              {messages.themes.mockEmailCta}
            </span>
          </div>

          {/* Footer */}
          <div className="border-t border-black/5 px-6 py-4">
            <p className="text-xs" style={{ color: resolved.footerText }}>
              {messages.themes.mockEmailFooter}
            </p>
          </div>
        </div>
      )}

      {/* Resolved swatch grid */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
          {messages.themes.swatchGridTitle}
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {THEME_COLOR_TOKEN_KEYS.map((token) => (
            <ResolvedSwatch key={token} token={token} value={resolved[token]} />
          ))}
        </div>
      </div>
    </div>
  )
}

function ContrastBadge({
  corrected,
  ratio,
  background,
  text,
}: {
  corrected: boolean
  ratio: string
  background: HexColor
  text: HexColor
}) {
  return (
    <div
      role="status"
      className={
        corrected
          ? 'flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-500'
          : 'flex items-start gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-500'
      }
    >
      {corrected ? (
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      ) : (
        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      )}
      <span className="flex flex-col gap-0.5">
        <span className="font-medium">{messages.themes.contrastLabel}</span>
        <span>
          {corrected
            ? messages.themes.contrastCorrected(ratio)
            : messages.themes.contrastPass(ratio)}
        </span>
        <span className="font-mono text-[11px] opacity-80">
          {background} / {text}
        </span>
      </span>
    </div>
  )
}

function ResolvedSwatch({
  token,
  value,
}: {
  token: ThemeColorTokenKey
  value: HexColor
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-2 py-1.5">
      <span
        className="h-6 w-6 shrink-0 rounded border border-border/50"
        style={{ backgroundColor: value }}
        aria-hidden="true"
      />
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-xs text-foreground">
          {messages.email.themeTokenLabels[token]}
        </span>
        <span className="truncate font-mono text-[11px] text-muted-foreground">
          {value}
        </span>
      </span>
    </div>
  )
}
