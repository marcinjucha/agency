import { Card } from '@agency/ui'
import { CalendarBooking } from '@/features/survey/components/CalendarBooking'

interface PageProps {
  params: Promise<{
    token: string
  }>
  searchParams: Promise<{
    responseId?: string
    linkId?: string
  }>
}

export default async function SuccessPage({ params, searchParams }: PageProps) {
  // IMPORTANT: Next.js 15 requires await params
  const { token } = await params
  const { responseId, linkId } = await searchParams

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/30 to-muted py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Thank You Section */}
        <div className="mb-12">
          <Card className="p-8 text-center">
            <div className="mb-4">
              <svg
                className="mx-auto h-16 w-16 text-success"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>

            <h1 className="text-3xl font-bold text-foreground mb-4">
              Thank You!
            </h1>

            <p className="text-muted-foreground">
              Your survey has been submitted successfully. We will review your responses and get back to you soon.
            </p>
          </Card>
        </div>

        {/* Calendar Booking Section */}
        {responseId && linkId ? (
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-6">
              Book Your Appointment
            </h2>
            <CalendarBooking surveyId={linkId} responseId={responseId} />
          </div>
        ) : (
          <Card className="p-8">
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-sm text-primary">
              <p className="font-medium mb-1">What's Next?</p>
              <p>You will receive a confirmation email shortly. If you need to book an appointment, check your email for further instructions.</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

// Generate metadata for SEO
export function generateMetadata() {
  return {
    title: 'Survey Submitted - Legal Mind',
    description: 'Your survey has been submitted successfully.'
  }
}
