'use client'

import { useRouter } from 'next/navigation'
import {
  Card,
  CardContent,
  Button,
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@agency/ui'
import { FileText, Trash2 } from 'lucide-react'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'
import type { SurveyWithLinks } from '../types'
import { hasActiveLink } from '../utils'

interface SurveyCardProps {
  survey: SurveyWithLinks
  onDelete: (id: string) => void
  isDeleting: boolean
}

export function SurveyCard({ survey, onDelete, isDeleting }: SurveyCardProps) {
  const router = useRouter()
  const questionCount = Array.isArray(survey.questions) ? survey.questions.length : 0

  return (
    <Card
      className="group cursor-pointer overflow-hidden transition-transform hover:-translate-y-0.5 focus-within:ring-2 focus-within:ring-ring"
      role="button"
      tabIndex={0}
      onClick={() => router.push(routes.admin.survey(survey.id))}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          router.push(routes.admin.survey(survey.id))
        }
      }}
    >
      <CardContent className="p-3 space-y-1.5">
        {/* Header row: title + delete */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-foreground line-clamp-2 text-sm leading-snug">
            {survey.title}
          </h3>
          <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  disabled={isDeleting}
                  aria-label={messages.common.delete}
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                <AlertDialogHeader>
                  <AlertDialogTitle>{messages.surveys.deleteSurveyConfirmTitle}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {messages.surveys.deleteSurveyConfirmDescription(survey.title)}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{messages.common.cancel}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(survey.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {messages.common.delete}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Description */}
        {survey.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{survey.description}</p>
        )}

        {/* Footer: question count + status */}
        <div className="flex items-center gap-3 pt-0.5">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <FileText className="h-3.5 w-3.5" aria-hidden="true" />
            {messages.surveys.questionsCount(questionCount)}
          </span>
          <span
            className={`ml-auto px-2 py-0.5 rounded-full text-xs font-medium ${
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
      </CardContent>
    </Card>
  )
}
