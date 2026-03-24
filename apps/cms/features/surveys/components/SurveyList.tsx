'use client'

import { useQuery } from '@tanstack/react-query'
import { getSurveys } from '../queries'
import { Button, Card, LoadingState, ErrorState, EmptyState } from '@agency/ui'
import Link from 'next/link'
import { FileText, Plus } from 'lucide-react'
import { getSurveyStatusColor, type SurveyStatus } from '@/lib/utils/status'

export function SurveyList() {
  const { data: surveys, isLoading, error } = useQuery({
    queryKey: ['surveys'],
    queryFn: getSurveys,
  })

  if (isLoading) {
    return <LoadingState variant="spinner" message="Loading surveys..." />
  }

  if (error) {
    return <ErrorState message={error.message} />
  }

  if (!surveys || surveys.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No surveys"
        description="Get started by creating a new survey."
        action={
          <Link href="/admin/surveys/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Survey
            </Button>
          </Link>
        }
      />
    )
  }

  return (
    <div className="space-y-4">
      {surveys.map((survey) => (
        <Card key={survey.id} className="p-6 hover:shadow-md transition-shadow">
          <Link href={`/admin/surveys/${survey.id}`}>
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-foreground truncate">{survey.title}</h3>
                {survey.description && (
                  <p className="text-sm text-muted-foreground mt-1 truncate">{survey.description}</p>
                )}
                <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    {Array.isArray(survey.questions) ? survey.questions.length : 0} questions
                  </span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getSurveyStatusColor(
                      survey.status as SurveyStatus
                    )}`}
                  >
                    {survey.status}
                  </span>
                </div>
              </div>
            </div>
          </Link>
        </Card>
      ))}
    </div>
  )
}
