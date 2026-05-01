import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server-start.server'
import { messages } from '@/lib/messages'

export type AuthContext = {
  userId: string
  tenantId: string
  isSuperAdmin: boolean
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const getAuthContextFn = createServerFn({ method: 'POST' }).handler(async (): Promise<AuthContext | null> => {
  const supabase = createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: userData } = await (supabase as any)
    .from('users')
    .select('tenant_id, is_super_admin, role')
    .eq('id', user.id)
    .single()

  if (!userData?.tenant_id) return null

  return {
    userId: user.id,
    tenantId: userData.tenant_id as string,
    isSuperAdmin: (userData.is_super_admin as boolean) ?? false,
  }
})

export const loginFn = createServerFn({ method: 'POST' })
  .inputValidator((input: z.infer<typeof loginSchema>) => loginSchema.parse(input))
  .handler(
    async ({
      data,
    }): Promise<{ success: true } | { success: false; error: string }> => {
      const supabase = createServerClient()

      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (error) {
        console.error('[loginFn] Supabase auth error:', error.message)
        return { success: false as const, error: messages.login.invalidCredentials }
      }

      return { success: true as const }
    }
  )

export const logoutFn = createServerFn({ method: 'POST' }).handler(
  async (): Promise<{ success: true }> => {
    const supabase = createServerClient()
    await supabase.auth.signOut()
    return { success: true as const }
  }
)
