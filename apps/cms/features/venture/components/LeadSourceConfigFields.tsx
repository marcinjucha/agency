import type {
  UseFormRegister,
  UseFormWatch,
  UseFormSetValue,
  FieldErrors,
} from 'react-hook-form'
import { Input, Label } from '@agency/ui'
import { messages } from '@/lib/messages'
import type { CreateCampaignInput } from '../validation'
import { resolveLeadSourceSpec } from '../lead-sources/specs'
import { resolveMessageKey } from '../utils/resolve-message-key'

// ---------------------------------------------------------------------------
// Venture bonus-funnel — GENERIC lead-source config renderer (iter 2b).
//
// One renderer for EVERY provider — it walks the selected provider's
// `configFields` descriptor (lead-sources/specs.ts) instead of a per-provider
// component (council decision: lead-source config is a flat field list, so a
// registry of components would be over-engineered).
//
// STORAGE SPLIT mirrored from specs.ts (critical):
//   - `type:'secret'` → the DEDICATED secret column. Today the only secret is
//     Tally's, whose column is so_campaigns.tally_webhook_secret, so a secret
//     field binds to the RHF `tally_webhook_secret` path (the existing masked
//     affordance — blank = leave unchanged, placeholder •••• when already set).
//     It is NEVER written into lead_source_config. A 2nd provider with its own
//     secret column is iter 3.
//   - `type:'text'` → so_campaigns.lead_source_config (JSONB, non-secret),
//     keyed by field.key. Managed via watch/setValue on the record so a dynamic
//     key never has to satisfy RHF's static Path<> typing.
// ---------------------------------------------------------------------------

interface LeadSourceConfigFieldsProps {
  /** Selected provider id, or null for a draft (no source). */
  provider: string | null
  register: UseFormRegister<CreateCampaignInput>
  watch: UseFormWatch<CreateCampaignInput>
  setValue: UseFormSetValue<CreateCampaignInput>
  errors: FieldErrors<CreateCampaignInput>
  /** Dedicated secret column already set on the persisted row (has_webhook_secret). */
  secretAlreadySet: boolean
}

export function LeadSourceConfigFields({
  provider,
  register,
  watch,
  setValue,
  errors,
  secretAlreadySet,
}: LeadSourceConfigFieldsProps) {
  const spec = resolveLeadSourceSpec(provider)

  // Draft (no/unknown provider) or a provider with zero config fields → nothing
  // to configure. The publish-gate hint in the parent explains what to do next.
  if (!spec || spec.configFields.length === 0) return null

  const config = (watch('lead_source_config') as Record<string, unknown> | null) ?? {}

  return (
    <div className="space-y-5">
      {spec.configFields.map((field) => {
        const label = resolveMessageKey(field.labelKey)

        if (field.type === 'secret') {
          // Dedicated secret column path (tally_webhook_secret). Not prefilled:
          // blank = leave as-is on edit / no secret yet on create.
          const inputId = `lead-source-${field.key}`
          return (
            <div key={field.key} className="space-y-1.5">
              <Label htmlFor={inputId} className="text-sm font-medium">
                {label}
              </Label>
              <Input
                id={inputId}
                type="password"
                autoComplete="off"
                {...register('tally_webhook_secret')}
                placeholder={secretAlreadySet ? '••••••••' : ''}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {messages.venture.tallySecretHelp}
              </p>
              {errors.tally_webhook_secret && (
                <p className="text-xs text-destructive">
                  {errors.tally_webhook_secret.message}
                </p>
              )}
            </div>
          )
        }

        // Non-secret text field → lead_source_config JSONB, keyed by field.key.
        const inputId = `lead-source-${field.key}`
        const value = config[field.key]
        return (
          <div key={field.key} className="space-y-1.5">
            <Label htmlFor={inputId} className="text-sm font-medium">
              {label}
            </Label>
            <Input
              id={inputId}
              type="text"
              value={typeof value === 'string' ? value : ''}
              onChange={(e) =>
                setValue(
                  'lead_source_config',
                  { ...config, [field.key]: e.target.value },
                  { shouldDirty: true },
                )
              }
              className="text-sm"
            />
          </div>
        )
      })}
    </div>
  )
}
