'use client'

import { useQuery } from '@tanstack/react-query'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@agency/ui'
import { LoadingState, ErrorState, EmptyState } from '@agency/ui'
import { Inbox } from 'lucide-react'
import { getPipelineResponses } from '../queries'
import { PipelineView } from './PipelineView'
import { ResponsesTable } from './ResponsesTable'
import { AppointmentsTable } from './AppointmentsTable'
import { StatsBar } from './StatsBar'
import { messages } from '@/lib/messages'

const REFETCH_INTERVAL = 30_000

export function IntakeHub() {
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
            <PipelineView responses={responses} />
          )}
        </TabsContent>

        <TabsContent value="responses" className="mt-4">
          <ResponsesTable responses={responses ?? []} />
        </TabsContent>

        <TabsContent value="appointments" className="mt-4">
          <AppointmentsTable />
        </TabsContent>
      </Tabs>
    </div>
  )
}
