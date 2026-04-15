import { createFileRoute } from '@tanstack/react-router'
import { NewSurveyForm } from '@/features/surveys/components/NewSurveyForm'
import { buildCmsHead } from '@/lib/head'
import { messages } from '@/lib/messages'

export const Route = createFileRoute('/admin/surveys/new')({
  head: () => buildCmsHead(messages.pages.createSurvey),
  component: () => <NewSurveyForm />,
})
