'use server'

import { requireAuth } from '@/lib/auth'
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

    return { success: true }
  } catch {
    return { success: false, error: messages.appointments.deleteFailed }
  }
}
