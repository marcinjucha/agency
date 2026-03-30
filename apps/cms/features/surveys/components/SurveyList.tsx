'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSurveys } from '../queries'
import { deleteSurvey } from '../actions'
import {
  Button, Card, LoadingState, ErrorState, EmptyState,
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogFooter, AlertDialogTitle, AlertDialogDescription,
  AlertDialogAction, AlertDialogCancel,
} from '@agency/ui'
import Link from 'next/link'
import { FileText, Plus, Trash2 } from 'lucide-react'
import { getSurveyStatusColor, type SurveyStatus } from '@/lib/utils/status'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'

export function SurveyList() {
  const queryClient = useQueryClient()
  const { data: surveys, isLoading, error } = useQuery({
    queryKey: ['surveys'],
    queryFn: getSurveys,
  })
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteSurvey(id)
      if (!result.success) throw new Error(result.error)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveys'] })
      queryClient.invalidateQueries({ queryKey: ['intake'] })
    },
  })

  if (isLoading) {
    return <LoadingState variant="spinner" message={messages.surveys.loadingSurveys} />
  }

  if (error) {
    return <ErrorState message={error.message} />
  }

  if (!surveys || surveys.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title={messages.surveys.noSurveys}
        description={messages.surveys.noSurveysDescription}
        action={
          <Link href={routes.admin.surveyNew}>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {messages.surveys.createSurvey}
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
          <div className="flex items-start justify-between">
            <Link href={routes.admin.survey(survey.id)} className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-foreground truncate">{survey.title}</h3>
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
            </Link>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  className="p-3 text-muted-foreground hover:text-destructive transition-colors rounded-md hover:bg-muted"
                  aria-label="Usuń"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{messages.surveys.deleteSurveyConfirmTitle}</AlertDialogTitle>
                  <AlertDialogDescription>{messages.surveys.deleteSurveyConfirmDescription(survey.title)}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{messages.common.cancel}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteMutation.mutate(survey.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {messages.common.delete}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </Card>
      ))}
    </div>
  )
}
