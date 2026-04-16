import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteSurveyFn, getSurveysFn } from '../server'
import {
  Button, Card, LoadingState, ErrorState, EmptyState,
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogFooter, AlertDialogTitle, AlertDialogDescription,
  AlertDialogAction, AlertDialogCancel,
} from '@agency/ui'
import { Link } from '@tanstack/react-router'
import { FileText, Plus, Trash2 } from 'lucide-react'
import { hasActiveLink } from '../utils'
import { queryKeys } from '@/lib/query-keys'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'
import { useViewMode } from '@/hooks/use-view-mode'
import { ViewModeToggle } from '@/components/shared/ViewModeToggle'
import { SurveyCard } from './SurveyCard'

export function SurveyList() {
  const queryClient = useQueryClient()
  const [viewMode, setViewMode] = useViewMode('surveys-view-mode', 'grid')

  const { data: surveys, isLoading, error } = useQuery({
    queryKey: queryKeys.surveys.all,
    queryFn: () => getSurveysFn(),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteSurveyFn({ data: { id } })
      if (!result.success) throw new Error(result.error)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.surveys.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.intake.all })
    },
  })

  if (isLoading) {
    return <LoadingState variant="skeleton-grid" rows={8} />
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
          <Link to={routes.admin.surveyNew}>
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
      {/* View toggle */}
      <div className="flex items-center justify-end">
        <ViewModeToggle value={viewMode} onChange={setViewMode} />
      </div>

      {viewMode === 'grid' ? (
        /* Grid view */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {surveys.map((survey) => (
            <SurveyCard
              key={survey.id}
              survey={survey}
              onDelete={(id) => deleteMutation.mutate(id)}
              isDeleting={deleteMutation.isPending && deleteMutation.variables === survey.id}
            />
          ))}
        </div>
      ) : (
        /* List view — original layout */
        <div className="space-y-4">
          {surveys.map((survey) => (
            <Card key={survey.id} className="p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <Link to={routes.admin.survey(survey.id)} className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-foreground truncate">{survey.title}</h3>
                  {survey.description && (
                    <p className="text-sm text-muted-foreground mt-1 truncate">{survey.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      {messages.surveys.questionsCount(Array.isArray(survey.questions) ? survey.questions.length : 0)}
                    </span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        hasActiveLink(survey.survey_links)
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-muted text-muted-foreground border border-border'
                      }`}
                    >
                      {hasActiveLink(survey.survey_links)
                        ? messages.surveys.statusActive
                        : messages.surveys.statusInactive}
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
      )}
    </div>
  )
}
