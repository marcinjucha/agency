import { createServerFn } from '@tanstack/react-start'
import { createServerClient } from '@/lib/supabase/server-start.server'
import { getAuthContextFn } from '@/lib/server-fns/auth'

export type DashboardStats = {
  surveys: number
  responses: number
  appointments: number
  /** null = user is not super admin, number = super admin count */
  tenants: number | null
}

/**
 * Fetches dashboard counts for the current tenant.
 * Super admins additionally receive a global tenant count.
 *
 * SRP: separate file because dashboard data is scoped to one route,
 * not shared with other parts of the admin layout.
 */
export const getDashboardStatsFn = createServerFn({ method: 'POST' }).handler(
  async (): Promise<DashboardStats> => {
    const auth = await getAuthContextFn()
    if (!auth) return { surveys: 0, responses: 0, appointments: 0, tenants: null }

    const supabase = createServerClient()

    const [surveysResult, responsesResult, appointmentsResult] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from('surveys')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', auth.tenantId),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from('responses')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', auth.tenantId),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', auth.tenantId),
    ])

    const tenants = await fetchTenantsCount(auth.isSuperAdmin, supabase)

    return {
      surveys: surveysResult.count ?? 0,
      responses: responsesResult.count ?? 0,
      appointments: appointmentsResult.count ?? 0,
      tenants,
    }
  }
)

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

type SupabaseClient = ReturnType<typeof createServerClient>

async function fetchTenantsCount(
  isSuperAdmin: boolean,
  supabase: SupabaseClient,
): Promise<number | null> {
  if (!isSuperAdmin) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count } = await (supabase as any)
    .from('tenants')
    .select('id', { count: 'exact', head: true })
  return count ?? 0
}
