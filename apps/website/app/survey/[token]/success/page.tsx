import { Card } from '@legal-mind/ui'

interface PageProps {
  params: Promise<{
    token: string
  }>
}

export default async function SuccessPage({ params }: PageProps) {
  // IMPORTANT: Next.js 15 requires await params
  const { token } = await params

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <Card className="max-w-md w-full p-8 text-center">
        <div className="mb-4">
          <svg
            className="mx-auto h-16 w-16 text-green-500"
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

        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Thank You!
        </h1>

        <p className="text-gray-600 mb-6">
          Your survey has been submitted successfully. We will review your responses and get back to you soon.
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <p className="font-medium mb-1">What's Next?</p>
          <p>You will receive a confirmation email shortly. If you need to book an appointment, check your email for further instructions.</p>
        </div>
      </Card>
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
