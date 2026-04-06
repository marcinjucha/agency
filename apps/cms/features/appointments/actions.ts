'use server'

import { requireAuth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'

export async function deleteAppointment(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await requireAuth('calendar')
    if (!auth.success) return auth

    const { supabase } = auth.data

    const { error } = await supabase.from('appointments').delete().eq('id', id)
    if (error) return { success: false, error: error.message }

    revalidatePath(routes.admin.appointments)
    revalidatePath(routes.admin.intake)
    return { success: true }
  } catch {
    return { success: false, error: messages.appointments.deleteFailed }
  }
}
