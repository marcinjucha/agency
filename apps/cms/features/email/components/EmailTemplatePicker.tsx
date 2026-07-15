import {
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@agency/ui'
import { messages } from '@/lib/messages'

// ---------------------------------------------------------------------------
// EmailTemplatePicker — REUSABLE presentational picker for "pick an email
// template for X".
//
// ZERO knowledge of any consuming feature (no venture imports, no data fetching,
// no mutations). Everything flows through props so any surface that needs to bind
// an email template to something can reuse this exact primitive. i18n strings come
// from the app-level `messages` singleton (same as every other email component).
//
// The control is a shadcn Select with one selectable option per template (by
// label). Nothing selected is represented by `value === null`. It maps to a
// controlled EMPTY-STRING root value (`value ?? ''`) — never `undefined` — so the
// Select stays CONTROLLED at all times: a null value renders the "Wybierz szablon"
// placeholder (no SelectItem matches ''), and CLEARING a selection visibly resets
// to the placeholder instead of Radix silently retaining the last value on a
// controlled→uncontrolled flip. Template ids are never '' so `onChange` only ever
// emits a real id; '' is not a selectable item. There is NO synthetic "default"
// item, because a campaign with no template selected sends no email (product
// decision 2026-07-15). Also renders an optional trailing "Edytuj szablon"
// deep-link and a non-blocking `role="status"` warning chip.
// ---------------------------------------------------------------------------

export interface EmailTemplatePickerOption {
  id: string
  label: string
  type: string
}

interface EmailTemplatePickerProps {
  templates: EmailTemplatePickerOption[]
  /** Currently-selected template id, or null when nothing is selected yet (placeholder). */
  value: string | null
  onChange: (id: string) => void
  /** Deep-link to edit the EFFECTIVE template; hides the edit link when null/undefined. */
  editHref?: string | null
  loading?: boolean
  disabled?: boolean
  /** Non-blocking advisory (e.g. a stale selection); rendered as a role="status" chip. */
  warning?: string | null
  /** Shown (muted) when `templates` is empty — e.g. "no bonus-capable templates yet". */
  emptyHint?: string
}

export function EmailTemplatePicker({
  templates,
  value,
  onChange,
  editHref,
  loading = false,
  disabled = false,
  warning,
  emptyHint,
}: EmailTemplatePickerProps) {
  const selectId = 'email-template-picker'
  const controlDisabled = disabled || loading

  return (
    <div className="space-y-1.5">
      <Label htmlFor={selectId} className="text-sm font-medium">
        {messages.email.templatePickerLabel}
      </Label>

      <Select
        // Controlled at all times: null → '' (no item matches → placeholder).
        // Never `undefined`, which would flip Radix to uncontrolled and retain
        // the just-cleared value. See the header comment for the full rationale.
        value={value ?? ''}
        onValueChange={onChange}
        disabled={controlDisabled}
      >
        <SelectTrigger id={selectId} className="text-sm">
          <SelectValue placeholder={messages.email.templatePickerPlaceholder} />
        </SelectTrigger>
        <SelectContent>
          {templates.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {loading && (
        <p className="text-xs text-muted-foreground">{messages.common.loading}</p>
      )}

      {!loading && templates.length === 0 && emptyHint && (
        <p className="text-xs text-muted-foreground">{emptyHint}</p>
      )}

      {warning && (
        <p
          role="status"
          className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300"
        >
          {warning}
        </p>
      )}

      {editHref && (
        <Button
          asChild
          variant="link"
          size="sm"
          className="block h-auto w-fit p-0 text-xs"
        >
          <a href={editHref}>{messages.email.templatePickerEdit}</a>
        </Button>
      )}
    </div>
  )
}
