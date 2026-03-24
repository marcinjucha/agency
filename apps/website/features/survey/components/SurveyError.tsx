import { Card } from '@agency/ui'

interface SurveyErrorProps {
  title?: string
  message: string
}

export function SurveyError({ title = 'Survey Unavailable', message }: SurveyErrorProps) {
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
          {title}
        </h1>
        <p className="text-lg text-muted-foreground">{message}</p>
      </Card>
    </div>
  )
}
