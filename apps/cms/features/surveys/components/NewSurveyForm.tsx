'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { createSurvey } from '@/features/surveys/actions'
import { Button, Input, Label, Card } from '@agency/ui'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { messages } from '@/lib/messages'

export function NewSurveyForm() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const queryClient = useQueryClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const result = await createSurvey({ title, description })

    if (result.success && result.surveyId) {
      await queryClient.invalidateQueries({ queryKey: ['surveys'] })
      router.push(`/admin/surveys/${result.surveyId}`)
    } else {
      setError(result.error || messages.surveys.createFailed)
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/surveys"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {messages.surveys.backToSurveys}
        </Link>
        <h1 className="text-3xl font-bold text-foreground">{messages.surveys.createNewSurvey}</h1>
        <p className="text-muted-foreground mt-1">{messages.surveys.setupNewForm}</p>
      </div>

      <Card className="max-w-2xl">
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">{messages.surveys.surveyTitleLabel}</Label>
              <Input
                id="title"
                type="text"
                placeholder={messages.surveys.surveyTitlePlaceholder}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                autoFocus
              />
              <p className="text-sm text-muted-foreground">
                {messages.surveys.surveyTitleHelp}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{messages.surveys.descriptionLabel}</Label>
              <Input
                id="description"
                type="text"
                placeholder={messages.surveys.descriptionPlaceholder}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">{messages.surveys.surveyDescriptionHelp}</p>
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={loading || !title.trim()}>
                {loading ? messages.surveys.creatingSurvey : messages.surveys.createSurvey}
              </Button>
              <Link href="/admin/surveys">
                <Button type="button" variant="outline">
                  {messages.common.cancel}
                </Button>
              </Link>
            </div>
          </form>
        </div>
      </Card>
    </div>
  )
}
