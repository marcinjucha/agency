import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { getSurveyLinkCalendarStatusFn } from '@/features/survey/server'
import { CalendarBooking } from '@/features/survey/components/CalendarBooking'
import { messages } from '@/lib/messages'
import { Card } from '@agency/ui'
import { CheckCircle, ClipboardCheck, Mail, Phone } from 'lucide-react'
import { buildWebsiteHead } from '@/lib/head'

// ---------------------------------------------------------------------------
// Route
// URL: /survey/:token/success?responseId=...&linkId=...
// ---------------------------------------------------------------------------

export const Route = createFileRoute('/survey/$token/success')({
  validateSearch: z.object({
    responseId: z.string().optional(),
    linkId: z.string().optional(),
  }),

  loaderDeps: ({ search }) => ({ linkId: search.linkId }),

  loader: async ({ deps }) => {
    const hasCalendar = deps.linkId
      ? await getSurveyLinkCalendarStatusFn({ data: { linkId: deps.linkId } })
      : false
    return { hasCalendar }
  },

  head: () => ({
    ...buildWebsiteHead(
      messages.success.metaTitle,
      messages.success.metaDescription,
    ),
    meta: [
      ...buildWebsiteHead(
        messages.success.metaTitle,
        messages.success.metaDescription,
      ).meta,
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),

  component: SuccessPage,
})

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

const NEXT_STEPS = [
  {
    icon: ClipboardCheck,
    title: messages.success.whatsNextStep1,
    description: messages.success.whatsNextStep1Description,
  },
  {
    icon: Mail,
    title: messages.success.whatsNextStep2,
    description: messages.success.whatsNextStep2Description,
  },
  {
    icon: Phone,
    title: messages.success.whatsNextStep3,
    description: messages.success.whatsNextStep3Description,
  },
] as const

function SuccessPage() {
  const { responseId, linkId } = Route.useSearch()
  const { hasCalendar } = Route.useLoaderData()
  const showBooking = responseId && linkId && hasCalendar

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/30 to-muted">
      {showBooking ? (
        <SuccessWithBooking linkId={linkId} responseId={responseId} />
      ) : (
        <SuccessWithoutBooking />
      )}
    </div>
  )
}

function SuccessWithBooking({
  linkId,
  responseId,
}: {
  linkId: string
  responseId: string
}) {
  return (
    <>
      <div className="px-4 pt-12 pb-6 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-success/10"
            aria-hidden="true"
          >
            <CheckCircle className="h-7 w-7 text-success" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {messages.success.thankYou}
            </h1>
            <p className="mt-1 text-sm text-foreground">
              {messages.success.surveySubmittedWithBooking}
            </p>
          </div>
        </div>
      </div>

      <CalendarBooking surveyId={linkId} responseId={responseId} />
    </>
  )
}

function SuccessWithoutBooking() {
  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Card className="border-border">
          <div className="p-8 sm:p-12">
            <div className="mb-8 pb-6 border-b border-border text-center">
              <div
                className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-success/10"
                aria-hidden="true"
              >
                <CheckCircle className="h-10 w-10 text-success" />
              </div>
              <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
                {messages.success.thankYou}
              </h1>
              <p className="mt-4 text-lg text-foreground max-w-lg mx-auto">
                {messages.success.surveySubmitted}
              </p>
            </div>

            <ol className="space-y-6" aria-label={messages.success.whatsNext}>
              {NEXT_STEPS.map((step, index) => {
                const Icon = step.icon
                return (
                  <li key={index} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                      </div>
                      {index < NEXT_STEPS.length - 1 && (
                        <div
                          className="mt-2 h-full w-px bg-border"
                          aria-hidden="true"
                        />
                      )}
                    </div>
                    <div className="min-w-0 pb-6">
                      <p className="text-sm font-semibold text-foreground">
                        {step.title}
                      </p>
                      <p className="mt-1 text-sm text-foreground">
                        {step.description}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ol>

            <div className="mt-2 pt-6 border-t border-border">
              <p className="text-sm text-foreground text-center">
                {messages.success.noCalendarReassurance}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
