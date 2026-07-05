import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  Button,
  Badge,
  Card,
  CardContent,
  Skeleton,
  ErrorState,
  EmptyState,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@agency/ui'
import { Gift, Plus } from 'lucide-react'
import { queryKeys } from '@/lib/query-keys'
import { routes } from '@/lib/routes'
import { messages } from '@/lib/messages'
import { listCampaignsFn, listClientsFn } from '../admin.server'
import type { Campaign, Client } from '../types'

const ALL_CLIENTS = '__all__'

// Primary venture view — campaigns grouped by client, filterable. Fetches all
// campaigns + clients once and groups client-side (avoids per-filter refetch).

export function VentureCampaignList() {
  const [clientFilter, setClientFilter] = useState<string>(ALL_CLIENTS)

  const clientsQuery = useQuery({
    queryKey: queryKeys.venture.clients,
    queryFn: async () => {
      const result = await listClientsFn()
      if (!result?.success) throw new Error(result?.error ?? messages.venture.loadClientsFailed)
      return result.data ?? []
    },
  })

  const campaignsQuery = useQuery({
    queryKey: queryKeys.venture.campaigns(),
    queryFn: async () => {
      const result = await listCampaignsFn({ data: {} })
      if (!result?.success) throw new Error(result?.error ?? messages.venture.loadCampaignsFailed)
      return result.data ?? []
    },
  })

  const isLoading = clientsQuery.isLoading || campaignsQuery.isLoading
  const error = clientsQuery.error ?? campaignsQuery.error

  if (isLoading) return <VentureCampaignListSkeleton />

  if (error) {
    return (
      <ErrorState
        title={messages.venture.loadCampaignsFailed}
        message={error instanceof Error ? error.message : messages.common.errorOccurred}
        onRetry={() => {
          clientsQuery.refetch()
          campaignsQuery.refetch()
        }}
        variant="card"
      />
    )
  }

  const clients = clientsQuery.data ?? []
  const campaigns = campaignsQuery.data ?? []
  const clientName = new Map(clients.map((c) => [c.id, c.name]))

  const filtered =
    clientFilter === ALL_CLIENTS
      ? campaigns
      : campaigns.filter((c) => c.client_id === clientFilter)

  const grouped = groupByClient(filtered)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-foreground">{messages.venture.campaignsTitle}</h1>
        <div className="flex items-center gap-3">
          {clients.length > 0 && (
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="w-[200px]" aria-label={messages.venture.filterByClient}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_CLIENTS}>{messages.venture.allClients}</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button asChild>
            <Link to={routes.admin.ventureCampaignNew}>
              <Plus className="mr-2 h-4 w-4" />
              {messages.venture.newCampaign}
            </Link>
          </Button>
        </div>
      </div>

      {/* Content */}
      {campaigns.length === 0 ? (
        <EmptyState
          icon={Gift}
          title={messages.venture.noCampaigns}
          description={messages.venture.noCampaignsDescription}
          variant="card"
          action={
            <Button asChild>
              <Link to={routes.admin.ventureCampaignNew}>
                <Plus className="mr-2 h-4 w-4" />
                {messages.venture.newCampaign}
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-8">
          {grouped.map(({ clientId, items }) => (
            <section key={clientId ?? '__unassigned__'} className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                {(clientId && clientName.get(clientId)) || messages.venture.unassignedClient}
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {items.map((campaign) => (
                  <CampaignCard
                    key={campaign.id}
                    campaign={campaign}
                    clientLabel={
                      (campaign.client_id && clientName.get(campaign.client_id)) ||
                      messages.venture.unassignedClient
                    }
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

// --- Card ---

function CampaignCard({ campaign, clientLabel }: { campaign: Campaign; clientLabel: string }) {
  return (
    <Link
      to={routes.admin.ventureCampaign(campaign.id)}
      className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card className="h-full overflow-hidden transition-transform hover:-translate-y-0.5">
        <CardContent className="space-y-1.5 p-3">
          <div className="flex items-start justify-between gap-2">
            <p className="line-clamp-2 font-semibold text-foreground">
              {campaign.display_name || campaign.slug}
            </p>
            <Badge
              variant="outline"
              className={
                campaign.published
                  ? 'shrink-0 border-emerald-500/20 bg-emerald-500/10 text-xs text-emerald-400'
                  : 'shrink-0 border-border bg-muted text-xs text-muted-foreground'
              }
            >
              {campaign.published ? messages.common.published : messages.common.draft}
            </Badge>
          </div>
          <p className="truncate font-mono text-xs text-muted-foreground">/{campaign.slug}</p>
          <p className="truncate text-xs text-muted-foreground">{clientLabel}</p>
        </CardContent>
      </Card>
    </Link>
  )
}

// --- Grouping ---

function groupByClient(campaigns: Campaign[]): { clientId: string | null; items: Campaign[] }[] {
  const groups = new Map<string | null, Campaign[]>()
  for (const campaign of campaigns) {
    const key = campaign.client_id ?? null
    const existing = groups.get(key)
    if (existing) existing.push(campaign)
    else groups.set(key, [campaign])
  }
  return Array.from(groups.entries()).map(([clientId, items]) => ({ clientId, items }))
}

// --- Skeleton ---

function VentureCampaignListSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-9 w-40" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    </div>
  )
}
