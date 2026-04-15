import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSurveyLinks } from '../queries'
import { generateSurveyLinkFn, deleteSurveyLinkFn, updateSurveyLinkFn } from '../server-fns'
import type { UpdateSurveyLinkFormData } from '../validation'
import {
  Button, Card, Input, Label, Switch,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogFooter, AlertDialogTitle, AlertDialogDescription,
  AlertDialogAction, AlertDialogCancel,
} from '@agency/ui'
import { Link as LinkIcon, Copy, Trash2, Plus, Check, Pencil, X, TriangleAlert } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { queryKeys } from '@/lib/query-keys'
import { messages } from '@/lib/messages'
import type { Tables } from '@agency/database'
import { getWorkflowsForSelector } from '@/features/workflows/queries'
import { SurveyLinkCalendarSelect, useCalendarConnectionName } from './SurveyLinkCalendarSelect'

type SurveyLinksProps = {
  surveyId: string
}

type SurveyLink = Tables<'survey_links'>

function CalendarConnectionDisplay({ connectionId }: { connectionId: string | null }) {
  const name = useCalendarConnectionName(connectionId)
  const label = messages.calendar.calendarSelectLabel
  const displayValue = connectionId ? (name ?? '...') : messages.calendar.calendarSelectNone
  return (
    <div>
      {label}: {displayValue}
    </div>
  )
}

function WorkflowDisplay({
  workflowId,
  workflows,
}: {
  workflowId: string | null
  workflows: WorkflowSelectorOption[]
}) {
  const label = messages.surveys.workflowSelectorLabel
  let displayValue: string
  if (!workflowId) {
    displayValue = messages.surveys.workflowSelectorNone
  } else {
    const found = workflows.find((w) => w.id === workflowId)
    displayValue = found ? found.name : workflowId
  }
  return (
    <div>
      {label}: {displayValue}
    </div>
  )
}

type WorkflowSelectorOption = { id: string; name: string }

type WorkflowSelectorProps = {
  workflows: WorkflowSelectorOption[]
  value: string | null
  onChange: (workflowId: string | null) => void
  selectId: string
}

function WorkflowSelector({ workflows, value, onChange, selectId }: WorkflowSelectorProps) {
  const NONE_VALUE = '__none__'
  const selectedValue = value ?? NONE_VALUE

  return (
    <div>
      <Label htmlFor={selectId} className="text-sm">
        {messages.surveys.workflowSelectorLabel}
      </Label>
      <Select
        value={selectedValue}
        onValueChange={(v) => onChange(v === NONE_VALUE ? null : v)}
      >
        <SelectTrigger id={selectId} className="mt-1 text-sm">
          <SelectValue placeholder={messages.surveys.workflowSelectorPlaceholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE_VALUE}>
            {messages.surveys.workflowSelectorNone}
          </SelectItem>
          {workflows.map((wf) => (
            <SelectItem key={wf.id} value={wf.id}>
              {wf.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {!value && (
        <div
          className="flex items-start gap-2 mt-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-400"
          role="note"
          aria-live="polite"
        >
          <TriangleAlert className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden="true" />
          <span>{messages.surveys.workflowSelectorHint}</span>
        </div>
      )}
    </div>
  )
}

export function SurveyLinks({ surveyId }: SurveyLinksProps) {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    notificationEmail: '',
    expiresAt: '',
    maxSubmissions: '',
    isActive: true,
    calendarConnectionId: null as string | null,
    workflowId: null as string | null,
  })
  const [editFormData, setEditFormData] = useState({
    notificationEmail: '',
    expiresAt: '',
    maxSubmissions: '',
    calendarConnectionId: null as string | null,
    workflowId: null as string | null,
  })

  // Query for links
  const { data: links, isLoading } = useQuery({
    queryKey: queryKeys.surveys.links(surveyId),
    queryFn: () => getSurveyLinks(surveyId),
  })

  // Query for active survey_submitted workflows — used in selector dropdown
  const { data: workflows = [] } = useQuery<WorkflowSelectorOption[]>({
    queryKey: queryKeys.workflows.list,
    queryFn: () => getWorkflowsForSelector(),
  })

  // Mutation for generating link — wraps to throw on failure (known project pattern)
  const generateMutation = useMutation({
    mutationFn: async () => {
      const result = await generateSurveyLinkFn({
        data: {
          surveyId,
          notificationEmail: formData.notificationEmail,
          expiresAt: formData.expiresAt || undefined,
          maxSubmissions: formData.maxSubmissions ? parseInt(formData.maxSubmissions) : null,
          isActive: formData.isActive,
          calendarConnectionId: formData.calendarConnectionId,
          workflowId: formData.workflowId,
        },
      })
      if (!result.success) throw new Error(result.error || messages.surveys.generateFailed)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.surveys.links(surveyId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.surveys.all })
      setShowForm(false)
      setFormData({ notificationEmail: '', expiresAt: '', maxSubmissions: '', isActive: true, calendarConnectionId: null, workflowId: null })
      setError(null)
    },
    onError: (err: Error) => {
      // inputValidator throws Zod errors as JSON — extract first human-readable message
      try {
        const zodErrors = JSON.parse(err.message)
        if (Array.isArray(zodErrors) && zodErrors[0]?.message) {
          setError(zodErrors[0].message)
          return
        }
      } catch {
        // Not JSON — fall through to raw message
      }
      setError(err.message)
    },
  })

  // Mutation for deleting link — wraps to throw on failure
  const deleteMutation = useMutation({
    mutationFn: async (linkId: string) => {
      const result = await deleteSurveyLinkFn({ data: { linkId, surveyId } })
      if (!result.success) throw new Error(result.error || messages.surveys.deleteLinkFailed2)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.surveys.links(surveyId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.surveys.all })
      setError(null)
    },
    onError: (err: Error) => {
      setError(err.message)
    },
  })

  // Mutation for toggling is_active — wraps to throw on failure
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ linkId, link, isActive }: { linkId: string; link: SurveyLink; isActive: boolean }) => {
      const data: UpdateSurveyLinkFormData = {
        notificationEmail: link.notification_email,
        expiresAt: link.expires_at ?? null,
        maxSubmissions: link.max_submissions ?? null,
        isActive,
      }
      const result = await updateSurveyLinkFn({ data: { linkId, surveyId, data } })
      if (!result.success) throw new Error(result.error || messages.surveys.updateLinkFailed)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.surveys.links(surveyId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.surveys.all })
      setError(null)
    },
    onError: (err: Error) => {
      setError(err.message)
    },
  })

  // Mutation for updating link (inline edit) — wraps to throw on failure
  const updateMutation = useMutation({
    mutationFn: async ({ linkId, link }: { linkId: string; link: SurveyLink }) => {
      const data: UpdateSurveyLinkFormData = {
        notificationEmail: editFormData.notificationEmail,
        expiresAt: editFormData.expiresAt || null,
        maxSubmissions: editFormData.maxSubmissions ? parseInt(editFormData.maxSubmissions) : null,
        isActive: link.is_active,
        calendarConnectionId: editFormData.calendarConnectionId,
        workflowId: editFormData.workflowId,
      }
      const result = await updateSurveyLinkFn({ data: { linkId, surveyId, data } })
      if (!result.success) throw new Error(result.error || messages.surveys.updateLinkFailed)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.surveys.links(surveyId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.surveys.all })
      setEditingLinkId(null)
      setError(null)
    },
    onError: (err: Error) => {
      setError(err.message)
    },
  })

  // Copy to clipboard
  async function copyToClipboard(token: string, linkId: string) {
    const websiteUrl = import.meta.env.VITE_WEBSITE_URL || 'http://localhost:3000'
    const fullUrl = `${websiteUrl}/survey/${token}`

    try {
      await navigator.clipboard.writeText(fullUrl)
      setCopiedLinkId(linkId)
      setTimeout(() => setCopiedLinkId(null), 2000)
    } catch {
      setError(messages.surveys.copyFailed)
    }
  }

  // Start editing a link
  function startEditing(link: SurveyLink) {
    setEditingLinkId(link.id)
    setEditFormData({
      notificationEmail: link.notification_email,
      expiresAt: link.expires_at ? link.expires_at.slice(0, 16) : '',
      maxSubmissions: link.max_submissions !== null ? String(link.max_submissions) : '',
      calendarConnectionId: link.calendar_connection_id ?? null,
      workflowId: link.workflow_id ?? null,
    })
    setError(null)
  }

  // Cancel editing
  function cancelEditing() {
    setEditingLinkId(null)
    setError(null)
  }

  // Format expires_at for display
  function formatExpiry(expiresAt: string | null) {
    if (!expiresAt) return messages.surveys.noExpiry
    return format(parseISO(expiresAt), 'PPp')
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold flex items-center">
          <LinkIcon className="mr-2 h-5 w-5" />
          {messages.surveys.surveyLinks}
        </h2>
        <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-4 w-4" />
          {messages.surveys.generateLink}
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-3 py-2 rounded text-sm mb-4">
          {error}
        </div>
      )}

      {/* Generate Link Form */}
      {showForm && (
        <div className="mb-4 p-4 bg-muted rounded-lg border border-border">
          <div className="space-y-3">
            <div>
              <Label htmlFor="notificationEmail" className="text-sm">
                {messages.surveys.notificationEmail} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="notificationEmail"
                type="email"
                required
                aria-required="true"
                value={formData.notificationEmail}
                onChange={(e) => setFormData({ ...formData, notificationEmail: e.target.value })}
                placeholder="kancelaria@example.com"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="expiresAt" className="text-sm">
                {messages.surveys.expirationDate}
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
                {messages.surveys.maxSubmissions}
              </Label>
              <Input
                id="maxSubmissions"
                type="number"
                min="1"
                value={formData.maxSubmissions}
                onChange={(e) => setFormData({ ...formData, maxSubmissions: e.target.value })}
                placeholder={messages.surveys.maxSubmissionsPlaceholder}
                className="mt-1"
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="newLinkIsActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                aria-label={formData.isActive ? messages.surveys.active : messages.surveys.inactive}
              />
              <Label htmlFor="newLinkIsActive" className="text-sm cursor-pointer">
                {formData.isActive ? messages.surveys.active : messages.surveys.inactive}
              </Label>
            </div>

            <SurveyLinkCalendarSelect
              mode="controlled"
              value={formData.calendarConnectionId}
              onChange={(connectionId) => setFormData({ ...formData, calendarConnectionId: connectionId })}
            />

            <WorkflowSelector
              workflows={workflows}
              value={formData.workflowId}
              onChange={(workflowId) => setFormData({ ...formData, workflowId })}
              selectId="newLink-workflowId"
            />

            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => {
                  if (!formData.notificationEmail) {
                    setError(messages.surveys.notificationEmailRequired)
                    return
                  }
                  generateMutation.mutate()
                }}
                disabled={generateMutation.isPending}
                size="sm"
              >
                {generateMutation.isPending ? messages.surveys.generating : messages.surveys.generate}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowForm(false)
                  setError(null)
                }}
                size="sm"
              >
                {messages.common.cancel}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Links List */}
      {isLoading ? (
        <div className="py-8 text-center text-muted-foreground text-sm">{messages.surveys.loadingLinks}</div>
      ) : !links || links.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground text-sm">
          <LinkIcon className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p>{messages.surveys.noLinksYet}</p>
          <p className="text-xs mt-1">{messages.surveys.noLinksDescription}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {links.map((link) => {
            const isEditing = editingLinkId === link.id

            return (
              <div key={link.id} className="p-3 bg-muted rounded-lg border border-border">
                {/* Row 1: token + active switch */}
                <div className="flex items-center gap-2 mb-2">
                  <code className="text-xs bg-card px-2 py-1 rounded border border-border flex-1 truncate">
                    {link.token}
                  </code>

                  <div className="flex items-center gap-1.5">
                    <Switch
                      checked={link.is_active}
                      onCheckedChange={(checked) =>
                        toggleActiveMutation.mutate({ linkId: link.id, link, isActive: checked })
                      }
                      disabled={toggleActiveMutation.isPending}
                      aria-label={link.is_active ? messages.surveys.active : messages.surveys.inactive}
                    />
                    <span className={`text-xs ${link.is_active ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {link.is_active ? messages.surveys.active : messages.surveys.inactive}
                    </span>
                  </div>
                </div>

                {/* Row 2: action buttons */}
                <div className="flex items-center gap-1.5 mb-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => copyToClipboard(link.token, link.id)}
                    aria-label={messages.common.copyLink}
                  >
                    {copiedLinkId === link.id ? (
                      <Check className="h-3.5 w-3.5 text-status-success-foreground" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>

                  {!isEditing ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => startEditing(link)}
                      aria-label={messages.surveys.editLink}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={cancelEditing}
                      aria-label={messages.surveys.editLinkCancel}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        aria-label={messages.common.delete}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{messages.surveys.deleteLinkConfirmTitle}</AlertDialogTitle>
                        <AlertDialogDescription>{messages.surveys.deleteLinkConfirmDescription}</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{messages.common.cancel}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteMutation.mutate(link.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {messages.common.delete}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                {/* Inline Edit Form */}
                {isEditing ? (
                  <div className="space-y-3 pt-2 border-t border-border mt-2">
                    <div>
                      <Label htmlFor={`edit-email-${link.id}`} className="text-sm font-medium">
                        {messages.surveys.notificationEmail} <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id={`edit-email-${link.id}`}
                        type="email"
                        required
                        aria-required="true"
                        value={editFormData.notificationEmail}
                        onChange={(e) => setEditFormData({ ...editFormData, notificationEmail: e.target.value })}
                        className="mt-1 text-sm"
                      />
                    </div>

                    <div>
                      <Label htmlFor={`edit-expires-${link.id}`} className="text-sm font-medium">
                        {messages.surveys.expirationDate}
                      </Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          id={`edit-expires-${link.id}`}
                          type="datetime-local"
                          value={editFormData.expiresAt}
                          onChange={(e) => setEditFormData({ ...editFormData, expiresAt: e.target.value })}
                          className="text-sm flex-1"
                        />
                        {editFormData.expiresAt && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditFormData({ ...editFormData, expiresAt: '' })}
                            className="h-8 px-2 text-xs text-muted-foreground"
                            aria-label={messages.surveys.noExpiry}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      {!editFormData.expiresAt && (
                        <p className="text-xs text-muted-foreground mt-1">{messages.surveys.noExpiry}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor={`edit-max-${link.id}`} className="text-sm font-medium">
                        {messages.surveys.maxSubmissions}
                      </Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          id={`edit-max-${link.id}`}
                          type="number"
                          min="1"
                          value={editFormData.maxSubmissions}
                          onChange={(e) => setEditFormData({ ...editFormData, maxSubmissions: e.target.value })}
                          placeholder={messages.surveys.noSubmissionLimit}
                          className="text-sm flex-1"
                        />
                        {editFormData.maxSubmissions && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditFormData({ ...editFormData, maxSubmissions: '' })}
                            className="h-8 px-2 text-xs text-muted-foreground"
                            aria-label={messages.surveys.noSubmissionLimit}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      {!editFormData.maxSubmissions && (
                        <p className="text-xs text-muted-foreground mt-1">{messages.surveys.noSubmissionLimit}</p>
                      )}
                    </div>

                    <SurveyLinkCalendarSelect
                      mode="controlled"
                      value={editFormData.calendarConnectionId}
                      onChange={(connectionId) => setEditFormData({ ...editFormData, calendarConnectionId: connectionId })}
                    />

                    <WorkflowSelector
                      workflows={workflows}
                      value={editFormData.workflowId}
                      onChange={(workflowId) => setEditFormData({ ...editFormData, workflowId })}
                      selectId={`edit-workflowId-${link.id}`}
                    />

                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        onClick={() => {
                          if (!editFormData.notificationEmail) {
                            setError(messages.surveys.notificationEmailRequired)
                            return
                          }
                          updateMutation.mutate({ linkId: link.id, link })
                        }}
                        disabled={updateMutation.isPending}
                        className="h-8 text-xs"
                      >
                        {updateMutation.isPending ? messages.common.saving : messages.surveys.editLinkSave}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={cancelEditing}
                        className="h-8 text-xs"
                      >
                        {messages.surveys.editLinkCancel}
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* Read-only Metadata */
                  <div className="text-xs text-muted-foreground space-y-1">
                    {link.notification_email && <div>Email: {link.notification_email}</div>}
                    <div>
                      {messages.surveys.expires} {formatExpiry(link.expires_at)}
                    </div>
                    <div>
                      {messages.surveys.submissions} {link.submission_count || 0} /{' '}
                      {link.max_submissions !== null ? link.max_submissions : messages.surveys.unlimited}
                    </div>
                    <CalendarConnectionDisplay connectionId={link.calendar_connection_id} />
                    <WorkflowDisplay workflowId={link.workflow_id} workflows={workflows} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
