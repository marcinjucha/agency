import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { SurveyBuilder } from '@/features/surveys/components/SurveyBuilder'

export default async function EditSurveyPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  // Check auth
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch survey
  const { data: survey, error } = await supabase
    .from('surveys')
    .select('*')
    .eq('id', params.id)
    .maybeSingle()

  if (error || !survey) {
    notFound()
  }

  return (
    <div>
      <SurveyBuilder survey={survey} />
    </div>
  )
}
