'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSurveyLinks } from '../queries'
import { generateSurveyLink, deleteSurveyLink } from '../actions'
import { Button, Card, Input, Label } from '@legal-mind/ui'
import { Link as LinkIcon, Copy, Trash2, Plus, Check } from 'lucide-react'
import { format, parseISO } from 'date-fns'

type SurveyLinksProps = {
  surveyId: string
}

export function SurveyLinks({ surveyId }: SurveyLinksProps) {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    clientEmail: '',
    expiresAt: '',
    maxSubmissions: '',
  })

  // Query for links
  const { data: links, isLoading } = useQuery({
    queryKey: ['survey-links', surveyId],
    queryFn: () => getSurveyLinks(surveyId),
  })

  // Mutation for generating link
  const generateMutation = useMutation({
    mutationFn: () =>
      generateSurveyLink(surveyId, {
        clientEmail: formData.clientEmail || undefined,
        expiresAt: formData.expiresAt || undefined,
        maxSubmissions: formData.maxSubmissions ? parseInt(formData.maxSubmissions) : null,
      }),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['survey-links', surveyId] })
        setShowForm(false)
        setFormData({ clientEmail: '', expiresAt: '', maxSubmissions: '' })
        setError(null)
      } else {
        setError(result.error || 'Failed to generate link')
      }
    },
  })

  // Mutation for deleting link
  const deleteMutation = useMutation({
    mutationFn: (linkId: string) => deleteSurveyLink(linkId),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['survey-links', surveyId] })
        setError(null)
      } else {
        setError(result.error || 'Failed to delete link')
      }
    },
  })

  // Copy to clipboard
  async function copyToClipboard(token: string, linkId: string) {
    const websiteUrl = process.env.NEXT_PUBLIC_WEBSITE_URL || 'http://localhost:3000'
    const fullUrl = `${websiteUrl}/survey/${token}`

    try {
      await navigator.clipboard.writeText(fullUrl)
      setCopiedLinkId(linkId)
      setTimeout(() => setCopiedLinkId(null), 2000)
    } catch (err) {
      setError('Failed to copy link to clipboard')
    }
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center">
          <LinkIcon className="mr-2 h-5 w-5" />
          Survey Links
        </h2>
        <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-4 w-4" />
          Generate Link
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm mb-4">
          {error}
        </div>
      )}

      {/* Generate Link Form */}
      {showForm && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="space-y-3">
            <div>
              <Label htmlFor="clientEmail" className="text-sm">
                Client Email (optional)
              </Label>
              <Input
                id="clientEmail"
                type="email"
                value={formData.clientEmail}
                onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                placeholder="client@example.com"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="expiresAt" className="text-sm">
                Expiration Date (optional)
              </Label>
              <Input
                id="expiresAt"
                type="datetime-local"
                value={formData.expiresAt}
                onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="maxSubmissions" className="text-sm">
                Max Submissions (optional, leave empty for unlimited)
              </Label>
              <Input
                id="maxSubmissions"
                type="number"
                min="1"
                value={formData.maxSubmissions}
                onChange={(e) => setFormData({ ...formData, maxSubmissions: e.target.value })}
                placeholder="Unlimited"
                className="mt-1"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
                size="sm"
              >
                {generateMutation.isPending ? 'Generating...' : 'Generate'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowForm(false)
                  setError(null)
                }}
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Links List */}
      {isLoading ? (
        <div className="py-8 text-center text-gray-500 text-sm">Loading links...</div>
      ) : !links || links.length === 0 ? (
        <div className="py-8 text-center text-gray-500 text-sm">
          <LinkIcon className="mx-auto h-8 w-8 text-gray-400 mb-2" />
          <p>No survey links yet</p>
          <p className="text-xs mt-1">Generate a link to share this survey</p>
        </div>
      ) : (
        <div className="space-y-3">
          {links.map((link) => (
            <div key={link.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              {/* Token Display */}
              <div className="flex items-center gap-2 mb-2">
                <code className="text-xs bg-white px-2 py-1 rounded border border-gray-200 flex-1 truncate">
                  {link.token}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(link.token, link.id)}
                >
                  {copiedLinkId === link.id ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (confirm('Delete this survey link?')) {
                      deleteMutation.mutate(link.id)
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>

              {/* Metadata */}
              <div className="text-xs text-gray-600 space-y-1">
                {link.client_email && <div>Email: {link.client_email}</div>}
                <div>
                  Expires: {link.expires_at ? format(parseISO(link.expires_at), 'PPp') : 'Never'}
                </div>
                <div>
                  Submissions: {link.submission_count || 0} /{' '}
                  {link.max_submissions !== null ? link.max_submissions : 'Unlimited'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
