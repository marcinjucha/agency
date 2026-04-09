import { CalendarBooking } from '@/features/survey/components/CalendarBooking'
import { messages } from '@/lib/messages'
import { getSurveyLinkCalendarStatus } from '@/features/survey/queries'
import { Card } from '@agency/ui'
import { CheckCircle, ClipboardCheck, Mail, Phone } from 'lucide-react'

interface PageProps {
  params: Promise<{
    token: string
  }>
  searchParams: Promise<{
    responseId?: string
    linkId?: string
  }>
}

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

export default async function SuccessPage({ params, searchParams }: PageProps) {
  // IMPORTANT: Next.js 15 requires await params
  const { token } = await params
  const { responseId, linkId } = await searchParams

  // Suppress unused variable warning — token reserved for future use (e.g., survey-specific branding)
  void token

  // Check if this survey link has a calendar connection configured
  const hasCalendar = linkId ? await getSurveyLinkCalendarStatus(linkId) : false
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

/**
 * Scenario A: Survey has calendar -- compact thank-you banner, then booking flow.
 * The thank-you message is brief because the primary action is booking.
 */
function SuccessWithBooking({
  linkId,
  responseId,
}: {
  linkId: string
  responseId: string
}) {
  return (
    <>
      {/* Compact thank-you banner */}
      <div className="px-4 pt-12 pb-6 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
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
            <p className="mt-1 text-sm text-muted-foreground">
              {messages.success.surveySubmittedWithBooking}
            </p>
          </div>
        </div>
      </div>

      {/* CalendarBooking renders its own full layout (Card, form, success state) */}
      <CalendarBooking surveyId={linkId} responseId={responseId} />
    </>
  )
}

/**
 * Scenario B: Survey has NO calendar -- full thank-you card with timeline steps.
 * Matches the SurveyForm visual pattern (Card, max-w-3xl, same padding).
 */
function SuccessWithoutBooking() {
  return (
    <div className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Card className="border-border">
          <div className="p-8 sm:p-12">
            {/* Success header */}
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
              <p className="mt-4 text-lg text-muted-foreground max-w-lg mx-auto">
                {messages.success.surveySubmitted}
              </p>
            </div>

            {/* Timeline steps */}
            <ol
              className="space-y-6"
              aria-label={messages.success.whatsNext}
            >
              {NEXT_STEPS.map((step, index) => {
                const Icon = step.icon
                return (
                  <li key={index} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Icon
                          className="h-5 w-5 text-primary"
                          aria-hidden="true"
                        />
                      </div>
                      {/* Connector line between steps */}
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
                      <p className="mt-1 text-sm text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ol>

            {/* Reassurance footer */}
            <div className="mt-2 pt-6 border-t border-border">
              <p className="text-sm text-muted-foreground text-center">
                {messages.success.noCalendarReassurance}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

// Generate metadata for SEO
export function generateMetadata() {
  return {
    title: messages.success.metaTitle,
    description: messages.success.metaDescription,
  }
}
