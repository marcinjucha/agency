import { notFound } from 'next/navigation'
import { SurveyBuilder } from '@/features/surveys/components/SurveyBuilder'
import { getSurveyServer } from '@/features/surveys/queries.server'

export default async function EditSurveyPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const survey = await getSurveyServer(id)

  if (!survey) {
    notFound()
  }

  return (
    <div>
      <SurveyBuilder survey={survey} />
    </div>
  )
}
