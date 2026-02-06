'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSurvey } from '@/features/surveys/actions'
import { Button, Input, Label, Card } from '@agency/ui'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewSurveyPage() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const result = await createSurvey({ title, description })

    if (result.success && result.surveyId) {
      router.push(`/admin/surveys/${result.surveyId}`)
    } else {
      setError(result.error || 'Failed to create survey')
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
          Back to Surveys
        </Link>
        <h1 className="text-3xl font-bold text-foreground">Create New Survey</h1>
        <p className="text-muted-foreground mt-1">Set up a new client intake form</p>
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
              <Label htmlFor="title">Survey Title *</Label>
              <Input
                id="title"
                type="text"
                placeholder="Client Intake Form"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                autoFocus
              />
              <p className="text-sm text-muted-foreground">
                This will be shown to clients when they fill out the form
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                type="text"
                placeholder="Please provide your information to help us serve you better"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">Optional description shown below the title</p>
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={loading || !title.trim()}>
                {loading ? 'Creating...' : 'Create Survey'}
              </Button>
              <Link href="/admin/surveys">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </div>
      </Card>
    </div>
  )
}
