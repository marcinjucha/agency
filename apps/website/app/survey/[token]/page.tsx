/**
 * Survey Page Route - Public Survey Access
 *
 * Server Component that fetches survey by token and renders the form.
 * Handles all validation error states (expired, inactive, not found, max_submissions).
 *
 * PATTERN: Dynamic Route with Data Fetching (ADR-005)
 * - Minimal routing logic only
 * - Imports components from features/
 * - Server Component with async/await
 * - Next.js 15 async params
 *
 * @route /survey/[token]
 * @module apps/website/app/survey/[token]/page
 */

import { getSurveyByToken } from '@/features/survey/queries'
import { SurveyForm } from '@/features/survey/components/SurveyForm'
import { Card } from '@agency/ui'

interface PageProps {
  params: Promise<{
    token: string
  }>
}

export default async function SurveyPage({ params }: PageProps) {
  // IMPORTANT: Next.js 15 requires await params
  const { token } = await params

  // Fetch survey with comprehensive validation
  const result = await getSurveyByToken(token)

  // Handle validation errors
  if (!result.isValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-muted/30 to-muted p-6">
        <Card className="max-w-md w-full p-10 text-center shadow-xl border-0">
          <div className="mb-6">
            <svg
              className="mx-auto h-16 w-16 text-destructive"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-3">
            Survey Unavailable
          </h1>
          <p className="text-lg text-muted-foreground">{result.message}</p>
        </Card>
      </div>
    )
  }

  // Render survey form with validated data
  // TypeScript assertion: data exists when isValid is true
  if (!result.data) {
    throw new Error('Invalid state: data missing when validation passed')
  }

  return <SurveyForm survey={result.data.survey} linkId={result.data.id} token={token} />
}

/**
 * Generate dynamic metadata for SEO
 *
 * IMPORTANT: This runs on every page load (not statically generated)
 * because survey data can change dynamically.
 */
export async function generateMetadata({ params }: PageProps) {
  const { token } = await params
  const result = await getSurveyByToken(token)

  if (!result.isValid || !result.data) {
    return {
      title: 'Survey Unavailable - Halo Efekt',
      description: 'This survey is no longer available.',
    }
  }

  return {
    title: `${result.data.survey.title} - Halo Efekt`,
    description:
      result.data.survey.description ||
      'Complete this survey to provide your information.',
  }
}
