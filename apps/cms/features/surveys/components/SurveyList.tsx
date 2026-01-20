'use client'

import { useQuery } from '@tanstack/react-query'
import { getSurveys } from '../queries'
import { Button, Card } from '@legal-mind/ui'
import Link from 'next/link'
import { FileText, Plus } from 'lucide-react'
import { getSurveyStatusColor } from '@/lib/utils/status'

export function SurveyList() {
  const { data: surveys, isLoading, error } = useQuery({
    queryKey: ['surveys'],
    queryFn: getSurveys,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading surveys...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        Error loading surveys: {error.message}
      </div>
    )
  }

  if (!surveys || surveys.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-semibold text-gray-900">No surveys</h3>
        <p className="mt-1 text-sm text-gray-500">Get started by creating a new survey.</p>
        <div className="mt-6">
          <Link href="/admin/surveys/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Survey
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {surveys.map((survey) => (
        <Card key={survey.id} className="p-6 hover:shadow-md transition-shadow">
          <Link href={`/admin/surveys/${survey.id}`}>
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 truncate">{survey.title}</h3>
                {survey.description && (
                  <p className="text-sm text-gray-600 mt-1 truncate">{survey.description}</p>
                )}
                <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    {Array.isArray(survey.questions) ? survey.questions.length : 0} questions
                  </span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getSurveyStatusColor(
                      survey.status
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
