'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Tables, TablesInsert } from '@legal-mind/database'

/**
 * Create a new survey
 * Automatically assigns current user's tenant_id
 */
export async function createSurvey(formData: {
  title: string
  description?: string
}): Promise<{ success: boolean; surveyId?: string; error?: string }> {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    // Get user's tenant_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .maybeSingle()

    if (userError || !userData) {
      return { success: false, error: 'User not found in database' }
    }

    // Type assertion for Supabase inference
    const userWithTenant = userData as Pick<Tables<'users'>, 'tenant_id'>

    // Create survey
    const surveyData: TablesInsert<'surveys'> = {
      title: formData.title,
      description: formData.description || null,
      tenant_id: userWithTenant.tenant_id,
      created_by: user.id,
      questions: [],
      status: 'draft',
    }

    const { data: survey, error: insertError } = await supabase
      .from('surveys')
      .insert(surveyData as any) // Type assertion for Supabase insert
      .select()
      .single()

    if (insertError || !survey) {
      return { success: false, error: insertError?.message || 'Failed to create survey' }
    }

    revalidatePath('/admin/surveys')
    return { success: true, surveyId: (survey as Tables<'surveys'>).id }
  } catch (error) {
    return { success: false, error: 'Failed to create survey' }
  }
}

/**
 * Update survey details
 */
export async function updateSurvey(
  id: string,
  data: Partial<Pick<Tables<'surveys'>, 'title' | 'description' | 'status' | 'questions'>>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    // @ts-expect-error - Supabase type inference issue with Server Actions
    const { error } = await supabase.from('surveys').update(data).eq('id', id)

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/admin/surveys')
    revalidatePath(`/admin/surveys/${id}`)
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to update survey' }
  }
}

/**
 * Delete survey
 */
export async function deleteSurvey(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const { error } = await supabase.from('surveys').delete().eq('id', id)

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/admin/surveys')
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to delete survey' }
  }
}
