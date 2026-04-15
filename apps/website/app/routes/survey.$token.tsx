import { createFileRoute } from '@tanstack/react-router'
import { getSurveyByTokenFn } from '@/features/survey/server'
import { SurveyForm } from '@/features/survey/components/SurveyForm'
import { SurveyError } from '@/features/survey/components/SurveyError'
import { messages } from '@/lib/messages'
import { buildWebsiteHead } from '@/lib/head'

export const Route = createFileRoute('/survey/$token')({
  loader: async ({ params }) =>
    getSurveyByTokenFn({ data: { token: params.token } }),

  head: ({ loaderData }) => {
    if (!loaderData?.isValid || !loaderData?.data) {
      return {
        ...buildWebsiteHead(
          messages.metadata.surveyUnavailableTitle,
          messages.metadata.surveyUnavailableDescription,
        ),
        meta: [
          ...buildWebsiteHead(
            messages.metadata.surveyUnavailableTitle,
            messages.metadata.surveyUnavailableDescription,
          ).meta,
          { name: 'robots', content: 'noindex, nofollow' },
        ],
      }
    }
    const title = `${loaderData.data.survey.title} — Halo Efekt`
    const description =
      loaderData.data.survey.description ||
      messages.metadata.defaultSurveyDescription
    return {
      ...buildWebsiteHead(title, description),
      meta: [
        ...buildWebsiteHead(title, description).meta,
        { name: 'robots', content: 'noindex, nofollow' },
      ],
    }
  },

  component: SurveyPage,
})

function SurveyPage() {
  const result = Route.useLoaderData()

  if (!result.isValid) {
    return (
      <SurveyError
        message={result.message ?? messages.survey.surveyUnavailable}
      />
    )
  }

  if (!result.data) {
    return (
      <SurveyError message={messages.survey.surveyUnavailable} />
    )
  }

  const { token } = Route.useParams()

  return (
    <SurveyForm
      survey={result.data.survey}
      linkId={result.data.id}
      token={token}
    />
  )
}
