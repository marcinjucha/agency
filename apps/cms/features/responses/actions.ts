'use server'

import { getUserWithTenant, isAuthError } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { revalidatePath } from 'next/cache'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'

export async function deleteResponse(
  id: string
): Promise<{ success: boolean; error?: string; hadAppointment?: boolean }> {
  try {
    const auth = await getUserWithTenant()
    if (isAuthError(auth)) return { success: false, error: auth.error }
    if (!hasPermission('surveys', auth.permissions)) {
      return { success: false, error: messages.common.noPermission }
    }

    const { supabase } = auth

    // Check if response has an appointment
    const { data: appointment } = await supabase
      .from('appointments')
      .select('id')
      .eq('response_id', id)
      .maybeSingle()

    // Delete appointment first if exists
    if (appointment) {
      const { error: appointmentError } = await supabase
        .from('appointments')
        .delete()
        .eq('response_id', id)

      if (appointmentError) return { success: false, error: appointmentError.message }
    }

    const { error } = await supabase.from('responses').delete().eq('id', id)
    if (error) return { success: false, error: error.message }

    revalidatePath(routes.admin.responses)
    revalidatePath(routes.admin.intake)
    if (appointment) revalidatePath(routes.admin.appointments)
    return { success: true, hadAppointment: !!appointment }
  } catch {
    return { success: false, error: messages.responses.deleteFailed }
  }
}

export async function triggerAiAnalysis(responseId: string): Promise<{ success: boolean; error?: string }> {
  const auth = await getUserWithTenant()
  if (isAuthError(auth)) return { success: false, error: auth.error }
  if (!hasPermission('surveys', auth.permissions)) {
    return { success: false, error: messages.common.noPermission }
  }

  const webhookUrl = process.env.N8N_WEBHOOK_SURVEY_ANALYSIS_URL
  if (!webhookUrl) {
    return { success: false, error: 'N8N_WEBHOOK_SURVEY_ANALYSIS_URL not configured' }
  }
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ responseId }),
    })
    if (!res.ok) return { success: false, error: `Webhook returned ${res.status}` }
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
