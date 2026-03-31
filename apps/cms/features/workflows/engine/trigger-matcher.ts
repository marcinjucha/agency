import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@agency/database'
import type { Workflow } from '../types'
import { toWorkflow } from '../types'

/**
 * Finds all active workflows matching a trigger type within a tenant.
 *
 * Simple SELECT query — no complex matching logic.
 * Uses idx_workflows_active_trigger index for efficient lookup.
 */
export async function findMatchingWorkflows(
  triggerType: string,
  tenantId: string,
  serviceClient: SupabaseClient<Database>
): Promise<Workflow[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- workflows type resolves to never (Supabase JS v2.95.2 incompatibility)
  const { data, error } = await (serviceClient as any)
    .from('workflows')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('trigger_type', triggerType)
    .eq('is_active', true)

  if (error) {
    throw new Error(`Failed to query matching workflows: ${error.message}`)
  }

  return (data || []).map(toWorkflow)
}
