'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@agency/ui'
import { LoadingState, ErrorState, EmptyState } from '@agency/ui'
import { Inbox } from 'lucide-react'
import { getPipelineResponses } from '../queries'
import { PipelineView } from './PipelineView'
import { ResponsesTable } from './ResponsesTable'
import { AppointmentsTable } from './AppointmentsTable'
import { StatsBar } from './StatsBar'
import { ResponseDetailPanel } from './ResponseDetailPanel'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'
import type { PipelineResponse } from '../types'

const REFETCH_INTERVAL = 30_000

/** Breakpoint value matching Tailwind xl (1280px) */
const XL_BREAKPOINT = 1280

export function IntakeHub() {
  const router = useRouter()
  const [selectedResponse, setSelectedResponse] = useState<PipelineResponse | null>(null)

  const {
    data: responses,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['intake', 'pipeline'],
    queryFn: getPipelineResponses,
    refetchInterval: REFETCH_INTERVAL,
  })

  /**
   * Handle response selection from child components.
   * On xl+ screens: show inline detail panel.
   * On smaller screens: navigate to full response page.
   */
  const handleSelectResponse = useCallback(
    (response: PipelineResponse) => {
      if (window.innerWidth >= XL_BREAKPOINT) {
        setSelectedResponse(response)
      } else {
        router.push(routes.admin.response(response.id))
      }
    },
    [router]
  )

  const handleClosePanel = useCallback(() => {
    setSelectedResponse(null)
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {messages.pages.intakeTitle}
        </h1>
        <p className="text-muted-foreground mt-1">
          {messages.pages.intakeDescription}
        </p>
      </div>

      <StatsBar />

      {/* Split layout: tabs + detail panel */}
      <div className="flex gap-0">
        {/* Left side: tabs content -- shrinks when panel is open */}
        <div
          className={`min-w-0 transition-all duration-200 ${
            selectedResponse ? 'hidden xl:block xl:flex-1' : 'flex-1'
          }`}
        >
          <Tabs defaultValue="pipeline" className="w-full">
            <TabsList>
              <TabsTrigger value="pipeline">
                {messages.intake.tabPipeline}
              </TabsTrigger>
              <TabsTrigger value="responses">
                {messages.intake.tabResponses}
              </TabsTrigger>
              <TabsTrigger value="appointments">
                {messages.intake.tabAppointments}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pipeline" className="mt-4">
              {isLoading ? (
                <LoadingState variant="skeleton-card" rows={3} />
              ) : error ? (
                <ErrorState
                  message={messages.common.errorOccurred}
                  onRetry={() => refetch()}
                />
              ) : !responses || responses.length === 0 ? (
                <EmptyState
                  icon={Inbox}
                  title={messages.intake.pipelineEmpty}
                  description={messages.intake.pipelineEmptyDescription}
                />
              ) : (
                <PipelineView
                  responses={responses}
                  onSelectResponse={handleSelectResponse}
                />
              )}
            </TabsContent>

            <TabsContent value="responses" className="mt-4">
              <ResponsesTable
                responses={responses ?? []}
                onSelectResponse={handleSelectResponse}
              />
            </TabsContent>

            <TabsContent value="appointments" className="mt-4">
              <AppointmentsTable />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right side: inline detail panel (xl+ only) */}
        {selectedResponse && (
          <div className="hidden xl:block border-l border-border">
            <ResponseDetailPanel
              response={selectedResponse}
              onClose={handleClosePanel}
            />
          </div>
        )}
      </div>
    </div>
  )
}
