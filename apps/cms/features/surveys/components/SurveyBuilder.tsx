import { useState, useMemo, useCallback, useEffect } from 'react'
import { useNavigate, Link } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { updateSurveyFn, deleteSurveyFn } from '@/lib/server-fns/surveys'
import { getSurvey } from '../queries'
import {
  Button, Input, Label, Card, CardHeader, CardContent, Badge, CollapsibleCard,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea, Checkbox,
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogFooter, AlertDialogTitle, AlertDialogDescription,
  AlertDialogAction, AlertDialogCancel,
  Tooltip, TooltipTrigger, TooltipContent, TooltipProvider,
} from '@agency/ui'
import {
  ArrowLeft, Plus, Trash2, Save, HelpCircle, UserPlus,
  GripVertical, Copy, Type, AlignLeft, Mail, Phone, ChevronDown, Circle, CheckSquare, Calendar, ShieldCheck,
} from 'lucide-react'
import { queryKeys } from '@/lib/query-keys'
import type { Tables, Json } from '@agency/database'
import { SurveyLinks } from './SurveyLinks'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'

import type { SemanticRole, Question } from '@agency/validators'

type SurveyBuilderProps = {
  surveyId: string
}

const QUESTION_TYPE_ICONS: Record<Question['type'], typeof Type> = {
  text: Type,
  textarea: AlignLeft,
  email: Mail,
  tel: Phone,
  select: ChevronDown,
  radio: Circle,
  checkbox: CheckSquare,
  date: Calendar,
  consent: ShieldCheck,
}

const QUESTION_TYPE_LABELS: Record<Question['type'], string> = {
  text: messages.surveys.typeShortText,
  textarea: messages.surveys.typeLongText,
  email: messages.surveys.typeEmail,
  tel: messages.surveys.typePhone,
  select: messages.surveys.typeDropdown,
  radio: messages.surveys.typeMultipleChoice,
  checkbox: messages.surveys.typeCheckboxes,
  date: messages.surveys.typeDate,
  consent: messages.surveys.typeConsent,
}

function parseQuestions(survey: Tables<'surveys'>): Question[] {
  if (!Array.isArray(survey.questions)) return []
  return (survey.questions as any[]).map((q, index) => ({
    id: q.id,
    type: q.type,
    question: q.question || q.label || messages.surveys.newQuestionDefault,
    required: q.required || false,
    options: q.options,
    order: q.order !== undefined ? q.order : index,
    semantic_role: q.semantic_role ?? null,
    placeholder: q.placeholder ?? '',
    consent_url: q.consent_url ?? '',
  }))
}

// --- Sortable Question Card ---

type SortableQuestionCardProps = {
  question: Question
  index: number
  onUpdate: (id: string, updates: Partial<Question>) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
}

function SortableQuestionCard({ question, index, onUpdate, onDelete, onDuplicate }: SortableQuestionCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const TypeIcon = QUESTION_TYPE_ICONS[question.type]

  return (
    <Card ref={setNodeRef} style={style} className={isDragging ? 'z-50' : ''}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
              aria-label={messages.surveys.dragToReorder}
            >
              <GripVertical className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium text-muted-foreground">
              {messages.surveys.questionNumber(index + 1)}
            </span>
            <Badge variant="secondary" className="gap-1 text-xs">
              <TypeIcon className="h-3 w-3" />
              {QUESTION_TYPE_LABELS[question.type]}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onDuplicate(question.id)}
              className="p-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors"
              aria-label={messages.surveys.duplicateQuestion}
            >
              <Copy className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDelete(question.id)}
              className="p-2 text-destructive hover:text-destructive rounded-md hover:bg-destructive/10 transition-colors"
              aria-label={messages.surveys.deleteQuestion}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <Label htmlFor={`question-text-${index}`}>{messages.surveys.questionLabel}</Label>
          <Input
            id={`question-text-${index}`}
            value={question.question}
            onChange={(e) => onUpdate(question.id, { question: e.target.value })}
            placeholder={messages.surveys.questionPlaceholder}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor={`question-type-${index}`}>{messages.surveys.questionType}</Label>
            <Select
              value={question.type}
              onValueChange={(value) => {
                const updates: Partial<Question> = { type: value as Question['type'] }
                if (value === 'consent') {
                  updates.question = messages.surveys.consentDefaultText
                  updates.required = true
                }
                onUpdate(question.id, updates)
              }}
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
                <SelectItem value="consent">{messages.surveys.typeConsent}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {question.type !== 'consent' && (
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={question.required}
                  onCheckedChange={(checked) =>
                    onUpdate(question.id, { required: checked === true })
                  }
                />
                <span className="text-sm">{messages.surveys.required}</span>
              </label>
            </div>
          )}
        </div>

        {question.type === 'consent' && (
          <div className="space-y-1.5">
            <Label htmlFor={`question-consent-url-${index}`}>{messages.surveys.consentUrlLabel}</Label>
            <Input
              id={`question-consent-url-${index}`}
              value={question.consent_url || ''}
              onChange={(e) => onUpdate(question.id, { consent_url: e.target.value })}
              placeholder={messages.surveys.consentUrlPlaceholder}
            />
            <p className="text-xs text-muted-foreground">{messages.surveys.consentUrlHint}</p>
          </div>
        )}

        {question.type !== 'consent' && (
          <div>
            <Label htmlFor={`question-placeholder-${index}`}>{messages.surveys.placeholderLabel}</Label>
            <Input
              id={`question-placeholder-${index}`}
              value={question.placeholder || ''}
              onChange={(e) => onUpdate(question.id, { placeholder: e.target.value })}
              placeholder={messages.surveys.placeholderHint}
            />
          </div>
        )}

        {question.type !== 'consent' && (
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
                onUpdate(question.id, {
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
        )}

        {(question.type === 'select' ||
          question.type === 'radio' ||
          question.type === 'checkbox') && (
          <div>
            <Label>{messages.surveys.optionsLabel}</Label>
            <Textarea
              value={question.options?.join('\n') || ''}
              onChange={(e) =>
                onUpdate(question.id, {
                  options: e.target.value.split('\n').filter((o) => o.trim()),
                })
              }
              placeholder={messages.surveys.optionsPlaceholder}
              rows={4}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// --- Main SurveyBuilder ---

export function SurveyBuilder({ surveyId }: SurveyBuilderProps) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const { data: survey, isLoading: surveyLoading, error: surveyError } = useQuery({
    queryKey: ['survey', surveyId],
    queryFn: () => getSurvey(surveyId),
  })

  const initialQuestions = useMemo(() => (survey ? parseQuestions(survey) : []), [survey])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)

  // Initialize form state once survey loads
  useEffect(() => {
    if (survey && !initialized) {
      setTitle(survey.title)
      setDescription(survey.description || '')
      setQuestions(parseQuestions(survey))
      setInitialized(true)
    }
  }, [survey, initialized])

  // Dirty state tracking
  const isDirty = useMemo(() => {
    if (!survey) return false
    if (title !== survey.title) return true
    if (description !== (survey.description || '')) return true
    if (JSON.stringify(questions) !== JSON.stringify(initialQuestions)) return true
    return false
  }, [title, description, questions, survey, initialQuestions])

  // Warn on navigation with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setQuestions((prev) => {
      const oldIndex = prev.findIndex((q) => q.id === active.id)
      const newIndex = prev.findIndex((q) => q.id === over.id)
      const reordered = arrayMove(prev, oldIndex, newIndex)
      return reordered.map((q, i) => ({ ...q, order: i }))
    })
  }, [])

  const addQuestion = useCallback(() => {
    const newQuestion: Question = {
      id: crypto.randomUUID(),
      type: 'text',
      question: messages.surveys.newQuestionDefault,
      required: false,
      order: questions.length,
      semantic_role: null,
      placeholder: '',
    }
    setQuestions((prev) => [...prev, newQuestion])
  }, [questions.length])

  const addContactFields = useCallback(() => {
    const baseOrder = questions.length
    const contactQuestions: Question[] = [
      {
        id: crypto.randomUUID(),
        type: 'text',
        question: messages.surveys.contactFieldName,
        required: true,
        order: baseOrder,
        semantic_role: 'client_name',
        placeholder: '',
      },
      {
        id: crypto.randomUUID(),
        type: 'email',
        question: messages.surveys.contactFieldEmail,
        required: true,
        order: baseOrder + 1,
        semantic_role: 'client_email',
        placeholder: '',
      },
    ]
    setQuestions((prev) => [...prev, ...contactQuestions])
  }, [questions.length])

  const updateQuestion = useCallback((id: string, updates: Partial<Question>) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...updates } : q)))
  }, [])

  const deleteQuestion = useCallback((id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id))
  }, [])

  const duplicateQuestion = useCallback((id: string) => {
    setQuestions((prev) => {
      const sourceIndex = prev.findIndex((q) => q.id === id)
      if (sourceIndex === -1) return prev
      const source = prev[sourceIndex]
      const copy: Question = {
        ...source,
        id: crypto.randomUUID(),
        question: `${source.question} ${messages.surveys.questionCopySuffix}`,
        options: source.options ? [...source.options] : undefined,
      }
      const next = [...prev]
      next.splice(sourceIndex + 1, 0, copy)
      return next.map((q, i) => ({ ...q, order: i }))
    })
  }, [])

  const handleSave = async () => {
    if (!survey) return
    setLoading(true)
    setError(null)

    const result = await updateSurveyFn({
      data: {
        id: survey.id,
        data: {
          title,
          description: description || null,
          questions: questions as unknown as Json,
        },
      },
    })

    if (result.success) {
      queryClient.invalidateQueries({ queryKey: queryKeys.surveys.all })
      navigate({ to: routes.admin.surveys })
    } else {
      setError(result.error || messages.surveys.saveFailed)
      setLoading(false)
    }
  }

  const questionIds = useMemo(() => questions.map((q) => q.id), [questions])

  if (surveyLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
        {messages.surveys.loadingSurveys}
      </div>
    )
  }

  if (surveyError || !survey) {
    return (
      <div className="flex items-center justify-center py-12 text-destructive text-sm">
        {messages.surveys.notFound}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          to={routes.admin.surveys}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {messages.surveys.backToSurveys}
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{messages.surveys.editSurvey}</h1>
            <p className="text-sm text-muted-foreground mt-1">{messages.surveys.designForm}</p>
          </div>
          <div className="flex items-center gap-2">
            {isDirty && (
              <span className="flex items-center gap-1.5 text-sm text-amber-400">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                {messages.surveys.unsavedChanges}
              </span>
            )}
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
                  <AlertDialogDescription>{messages.surveys.deleteSurveyConfirmDescription(survey?.title ?? '')}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{messages.common.cancel}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => {
                      if (!survey) return
                      setDeleting(true)
                      const result = await deleteSurveyFn({ data: { id: survey.id } })
                      if (result.success) {
                        queryClient.invalidateQueries({ queryKey: queryKeys.surveys.all })
                        queryClient.invalidateQueries({ queryKey: queryKeys.intake.all })
                        navigate({ to: routes.admin.surveys })
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

      <div className="mx-auto max-w-[1400px]">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6">
        {/* Left: Questions Builder */}
        <div>
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
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">{messages.surveys.noQuestionsYet}</p>
                <Button onClick={addQuestion}>
                  <Plus className="mr-2 h-4 w-4" />
                  {messages.surveys.addFirstQuestion}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              modifiers={[restrictToVerticalAxis]}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={questionIds} strategy={verticalListSortingStrategy}>
                <div className="space-y-4">
                  {questions.map((question, index) => (
                    <SortableQuestionCard
                      key={question.id}
                      question={question}
                      index={index}
                      onUpdate={updateQuestion}
                      onDelete={deleteQuestion}
                      onDuplicate={duplicateQuestion}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Right: Survey Settings + Survey Links */}
        <div className="space-y-6">
          <CollapsibleCard title={messages.surveys.surveySettings} defaultOpen className="sticky top-6">
            <div className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="title">{messages.surveys.titleLabel}</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={messages.surveys.titlePlaceholder}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">{messages.surveys.descriptionLabel}</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={messages.surveys.descriptionPlaceholder}
                  autoResize
                />
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  {messages.surveys.questionsCount(questions.length)}
                </p>
              </div>
            </div>
          </CollapsibleCard>

          {/* Survey Links Section */}
          <SurveyLinks surveyId={surveyId} />
        </div>
      </div>
      </div>
    </div>
  )
}
