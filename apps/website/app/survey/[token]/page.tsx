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
import { SurveyError } from '@/features/survey/components/SurveyError'
import { messages } from '@/lib/messages'

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
    return <SurveyError message={result.message ?? messages.survey.surveyUnavailable} />
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
      title: messages.metadata.surveyUnavailableTitle,
      description: messages.metadata.surveyUnavailableDescription,
    }
  }

  return {
    title: `${result.data.survey.title} - Halo Efekt`,
    description:
      result.data.survey.description ||
      messages.metadata.defaultSurveyDescription,
  }
}
