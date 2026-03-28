/**
 * Intake Hub Validation Schemas
 *
 * Zod schemas for Server Actions in actions.ts.
 * Status enum matches the CHECK constraint in
 * supabase/migrations/20260328000000_intake_hub_schema_changes.sql
 *
 * @module apps/cms/features/intake/validation
 */

import { z } from 'zod'

/** All valid response statuses matching DB CHECK constraint */
export const RESPONSE_STATUSES = [
  'new',
  'qualified',
  'disqualified',
  'contacted',
  'client',
  'rejected',
] as const

export const updateStatusSchema = z.object({
  responseId: z.string().uuid(),
  status: z.enum(RESPONSE_STATUSES),
})

export const updateNotesSchema = z.object({
  responseId: z.string().uuid(),
  notes: z.string().max(5000),
})
