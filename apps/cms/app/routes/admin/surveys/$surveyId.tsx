import { createFileRoute } from '@tanstack/react-router'
import { SurveyBuilder } from '@/features/surveys/components/SurveyBuilder'
import { buildCmsHead } from '@/lib/head'
import { messages } from '@/lib/messages'

export const Route = createFileRoute('/admin/surveys/$surveyId')({
  head: () => buildCmsHead(messages.nav.surveys),
  component: SurveyBuilderPage,
})

function SurveyBuilderPage() {
  const { surveyId } = Route.useParams()
  return <SurveyBuilder surveyId={surveyId} />
}
