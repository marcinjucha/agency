'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateSurvey } from '../actions'
import { Button, Input, Label, Card } from '@legal-mind/ui'
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react'
import Link from 'next/link'
import type { Tables } from '@legal-mind/database'
import { SurveyLinks } from './SurveyLinks'

type Question = {
  id: string
  type: 'text' | 'textarea' | 'email' | 'tel' | 'select' | 'radio' | 'checkbox'
  label: string
  required: boolean
  options?: string[]
}

type SurveyBuilderProps = {
  survey: Tables<'surveys'>
}

export function SurveyBuilder({ survey }: SurveyBuilderProps) {
  const [title, setTitle] = useState(survey.title)
  const [description, setDescription] = useState(survey.description || '')
  const [questions, setQuestions] = useState<Question[]>(
    Array.isArray(survey.questions) ? (survey.questions as Question[]) : []
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const addQuestion = () => {
    const newQuestion: Question = {
      id: crypto.randomUUID(),
      type: 'text',
      label: 'New Question',
      required: false,
    }
    setQuestions([...questions, newQuestion])
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
      questions: questions as any,
    })

    if (result.success) {
      router.push('/admin/surveys')
      router.refresh()
    } else {
      setError(result.error || 'Failed to save survey')
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/surveys"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Surveys
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Survey</h1>
            <p className="text-gray-600 mt-1">Design your client intake form</p>
          </div>
          <Button onClick={handleSave} disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            {loading ? 'Saving...' : 'Save Survey'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Survey Settings + Survey Links */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-6 sticky top-6">
            <h2 className="text-lg font-semibold mb-4">Survey Settings</h2>

            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Client Intake Form"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Help us understand your needs"
                />
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-gray-600">
                  <strong>{questions.length}</strong> question{questions.length !== 1 ? 's' : ''}
                </p>
                <p className="text-sm text-gray-500 mt-1">Status: {survey.status}</p>
              </div>
            </div>
          </Card>

          {/* Survey Links Section */}
          <SurveyLinks surveyId={survey.id} />
        </div>

        {/* Right: Questions Builder */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Questions</h2>
            <Button onClick={addQuestion} variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Add Question
            </Button>
          </div>

          {questions.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-gray-500 mb-4">No questions yet</p>
              <Button onClick={addQuestion}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Question
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {questions.map((question, index) => (
                <Card key={question.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <span className="text-sm font-medium text-gray-500">Question {index + 1}</span>
                    <button
                      onClick={() => deleteQuestion(question.id)}
                      className="text-red-600 hover:text-red-700"
                      aria-label="Delete question"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label>Question Text</Label>
                      <Input
                        value={question.label}
                        onChange={(e) => updateQuestion(question.id, { label: e.target.value })}
                        placeholder="What is your name?"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Type</Label>
                        <select
                          value={question.type}
                          onChange={(e) =>
                            updateQuestion(question.id, {
                              type: e.target.value as Question['type'],
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                          <option value="text">Short Text</option>
                          <option value="textarea">Long Text</option>
                          <option value="email">Email</option>
                          <option value="tel">Phone</option>
                          <option value="select">Dropdown</option>
                          <option value="radio">Multiple Choice</option>
                          <option value="checkbox">Checkboxes</option>
                        </select>
                      </div>

                      <div className="flex items-end">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={question.required}
                            onChange={(e) =>
                              updateQuestion(question.id, { required: e.target.checked })
                            }
                            className="w-4 h-4"
                          />
                          <span className="text-sm">Required</span>
                        </label>
                      </div>
                    </div>

                    {(question.type === 'select' ||
                      question.type === 'radio' ||
                      question.type === 'checkbox') && (
                      <div>
                        <Label>Options (one per line)</Label>
                        <textarea
                          value={question.options?.join('\n') || ''}
                          onChange={(e) =>
                            updateQuestion(question.id, {
                              options: e.target.value.split('\n').filter((o) => o.trim()),
                            })
                          }
                          placeholder="Option 1&#10;Option 2&#10;Option 3"
                          rows={4}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
