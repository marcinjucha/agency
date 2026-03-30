'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { updateSurvey, deleteSurvey } from '../actions'
import {
  Button, Input, Label, Card, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea, Checkbox,
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogFooter, AlertDialogTitle, AlertDialogDescription,
  AlertDialogAction, AlertDialogCancel,
  Tooltip, TooltipTrigger, TooltipContent, TooltipProvider,
} from '@agency/ui'
import { ArrowLeft, Plus, Trash2, Save, HelpCircle, UserPlus } from 'lucide-react'
import Link from 'next/link'
import type { Tables } from '@agency/database'
import { SurveyLinks } from './SurveyLinks'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'

import type { SemanticRole } from '@agency/validators'

type Question = {
  id: string
  type: 'text' | 'textarea' | 'email' | 'tel' | 'select' | 'radio' | 'checkbox' | 'date'
  question: string
  required: boolean
  options?: string[]
  order: number
  semantic_role?: SemanticRole | null
  placeholder?: string
}

type SurveyBuilderProps = {
  survey: Tables<'surveys'>
}

export function SurveyBuilder({ survey }: SurveyBuilderProps) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState(survey.title)
  const [description, setDescription] = useState(survey.description || '')
  const [questions, setQuestions] = useState<Question[]>(() => {
    // Migrate old format with 'label' to new format with 'question'
    if (!Array.isArray(survey.questions)) return []

    return (survey.questions as any[]).map((q, index) => ({
      id: q.id,
      type: q.type,
      question: q.question || q.label || 'New Question', // Support both old and new format
      required: q.required || false,
      options: q.options,
      order: q.order !== undefined ? q.order : index,
      semantic_role: q.semantic_role ?? null,
      placeholder: q.placeholder ?? '',
    }))
  })
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const addQuestion = () => {
    const newQuestion: Question = {
      id: crypto.randomUUID(),
      type: 'text',
      question: 'New Question',
      required: false,
      order: questions.length,
      semantic_role: null,
      placeholder: '',
    }
    setQuestions([...questions, newQuestion])
  }

  const addContactFields = () => {
    const baseOrder = questions.length
    const contactQuestions: Question[] = [
      {
        id: crypto.randomUUID(),
        type: 'text',
        question: 'Imię i nazwisko',
        required: true,
        order: baseOrder,
        semantic_role: 'client_name',
        placeholder: 'Jan Kowalski',
      },
      {
        id: crypto.randomUUID(),
        type: 'email',
        question: 'Email',
        required: true,
        order: baseOrder + 1,
        semantic_role: 'client_email',
        placeholder: 'jan@firma.pl',
      },
      {
        id: crypto.randomUUID(),
        type: 'text',
        question: 'Firma',
        required: false,
        order: baseOrder + 2,
        semantic_role: 'company_name',
        placeholder: 'Nazwa firmy',
      },
      {
        id: crypto.randomUUID(),
        type: 'tel',
        question: 'Telefon',
        required: false,
        order: baseOrder + 3,
        semantic_role: 'phone',
        placeholder: '+48 600 000 000',
      },
    ]
    setQuestions([...questions, ...contactQuestions])
  }

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setQuestions(questions.map((q) => (q.id === id ? { ...q, ...updates } : q)))
  }

  const deleteQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id))
  }

  const handleSave = async () => {
    setLoading(true)
    setError(null)

    const result = await updateSurvey(survey.id, {
      title,
      description: description || null,
      questions,
    })

    if (result.success) {
      router.push(routes.admin.surveys)
      router.refresh()
    } else {
      setError(result.error || messages.surveys.saveFailed)
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href={routes.admin.surveys}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {messages.surveys.backToSurveys}
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{messages.surveys.editSurvey}</h1>
            <p className="text-muted-foreground mt-1">{messages.surveys.designForm}</p>
          </div>
          <div className="flex items-center gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" disabled={deleting}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  {messages.common.delete}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{messages.surveys.deleteSurveyConfirmTitle}</AlertDialogTitle>
                  <AlertDialogDescription>{messages.surveys.deleteSurveyConfirmDescription(survey.title)}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{messages.common.cancel}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => {
                      setDeleting(true)
                      const result = await deleteSurvey(survey.id)
                      if (result.success) {
                        queryClient.invalidateQueries({ queryKey: ['surveys'] })
                        router.push(routes.admin.surveys)
                      } else {
                        setError(result.error || messages.surveys.deleteFailed)
                        setDeleting(false)
                      }
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {messages.common.delete}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button onClick={handleSave} disabled={loading}>
              <Save className="mr-2 h-4 w-4" />
              {loading ? messages.surveys.savingSurvey : messages.surveys.saveSurvey}
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Survey Settings + Survey Links */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-6 sticky top-6">
            <h2 className="text-base font-semibold mb-4">{messages.surveys.surveySettings}</h2>

            <div className="space-y-4">
              <div>
                <Label htmlFor="title">{messages.surveys.titleLabel}</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={messages.surveys.titlePlaceholder}
                />
              </div>

              <div>
                <Label htmlFor="description">{messages.surveys.descriptionLabel}</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={messages.surveys.descriptionPlaceholder}
                />
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  {messages.surveys.questionsCount(questions.length)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">Status: {survey.status}</p>
              </div>
            </div>
          </Card>

          {/* Survey Links Section */}
          <SurveyLinks surveyId={survey.id} />
        </div>

        {/* Right: Questions Builder */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold">{messages.surveys.questions}</h2>
            <div className="flex items-center gap-2">
              <Button onClick={addContactFields} variant="outline">
                <UserPlus className="mr-2 h-4 w-4" />
                {messages.surveys.addContactFields}
              </Button>
              <Button onClick={addQuestion} variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                {messages.surveys.addQuestion}
              </Button>
            </div>
          </div>

          {questions.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground mb-4">{messages.surveys.noQuestionsYet}</p>
              <Button onClick={addQuestion}>
                <Plus className="mr-2 h-4 w-4" />
                {messages.surveys.addFirstQuestion}
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {questions.map((question, index) => (
                <Card key={question.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <span className="text-sm font-medium text-muted-foreground">{messages.surveys.questionNumber(index + 1)}</span>
                    <button
                      onClick={() => deleteQuestion(question.id)}
                      className="p-3 text-destructive hover:text-destructive rounded-md hover:bg-destructive/10 transition-colors"
                      aria-label={messages.surveys.deleteQuestion}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor={`question-text-${index}`}>{messages.surveys.questionLabel}</Label>
                      <Input
                        id={`question-text-${index}`}
                        value={question.question}
                        onChange={(e) => updateQuestion(question.id, { question: e.target.value })}
                        placeholder={messages.surveys.questionPlaceholder}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`question-type-${index}`}>{messages.surveys.questionType}</Label>
                        <Select
                          value={question.type}
                          onValueChange={(value) =>
                            updateQuestion(question.id, {
                              type: value as Question['type'],
                            })
                          }
                        >
                          <SelectTrigger id={`question-type-${index}`}>
                            <SelectValue placeholder={messages.surveys.selectQuestionType} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">{messages.surveys.typeShortText}</SelectItem>
                            <SelectItem value="textarea">{messages.surveys.typeLongText}</SelectItem>
                            <SelectItem value="email">{messages.surveys.typeEmail}</SelectItem>
                            <SelectItem value="tel">{messages.surveys.typePhone}</SelectItem>
                            <SelectItem value="select">{messages.surveys.typeDropdown}</SelectItem>
                            <SelectItem value="radio">{messages.surveys.typeMultipleChoice}</SelectItem>
                            <SelectItem value="checkbox">{messages.surveys.typeCheckboxes}</SelectItem>
                            <SelectItem value="date">{messages.surveys.typeDate}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-end">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={question.required}
                            onCheckedChange={(checked) =>
                              updateQuestion(question.id, { required: checked === true })
                            }
                          />
                          <span className="text-sm">{messages.surveys.required}</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor={`question-placeholder-${index}`}>{messages.surveys.placeholderLabel}</Label>
                      <Input
                        id={`question-placeholder-${index}`}
                        value={question.placeholder || ''}
                        onChange={(e) => updateQuestion(question.id, { placeholder: e.target.value })}
                        placeholder={messages.surveys.placeholderHint}
                      />
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Label htmlFor={`question-role-${index}`}>{messages.surveys.semanticRole}</Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{messages.surveys.semanticRoleHint}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <Select
                        value={question.semantic_role || 'none'}
                        onValueChange={(value) =>
                          updateQuestion(question.id, {
                            semantic_role: value === 'none' ? null : (value as Question['semantic_role']),
                          })
                        }
                      >
                        <SelectTrigger id={`question-role-${index}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">{messages.surveys.semanticRoleNone}</SelectItem>
                          <SelectItem value="client_name">{messages.surveys.semanticRoleClientName}</SelectItem>
                          <SelectItem value="client_email">{messages.surveys.semanticRoleClientEmail}</SelectItem>
                          <SelectItem value="company_name">{messages.surveys.semanticRoleCompanyName}</SelectItem>
                          <SelectItem value="phone">{messages.surveys.semanticRolePhone}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {(question.type === 'select' ||
                      question.type === 'radio' ||
                      question.type === 'checkbox') && (
                      <div>
                        <Label>{messages.surveys.optionsLabel}</Label>
                        <Textarea
                          value={question.options?.join('\n') || ''}
                          onChange={(e) =>
                            updateQuestion(question.id, {
                              options: e.target.value.split('\n').filter((o) => o.trim()),
                            })
                          }
                          placeholder={messages.surveys.optionsPlaceholder}
                          rows={4}
                        />
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
