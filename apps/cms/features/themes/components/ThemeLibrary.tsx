import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Button, Card, EmptyState, ErrorState, Skeleton } from '@agency/ui'
import { Palette, Plus } from 'lucide-react'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'
import { queryKeys } from '@/lib/query-keys'
import { listThemesFn } from '../server'
import type { ThemeWithUsage } from '../types'
import { ThemeCard } from './ThemeCard'

// ---------------------------------------------------------------------------
// Theme Manager (iter D3a) — theme library (gallery grid).
//
// Handles all 4 UI states (loading skeleton / error / empty / success). Cards
// use the shared CMS gallery grid (md:2 xl:3 2xl:4 — ag-design-patterns). The
// primary "Nowy motyw" action sits in the page header (+ EmptyState CTA).
// ---------------------------------------------------------------------------

export function ThemeLibrary() {
  const { data, isLoading, error, refetch } = useQuery<ThemeWithUsage[]>({
    queryKey: queryKeys.themes.all,
    queryFn: () => listThemesFn(),
  })

  if (isLoading) return <ThemeLibrarySkeleton />

  if (error) {
    return (
      <ErrorState
        title={messages.themes.loadFailed}
        message={error instanceof Error ? error.message : messages.common.errorOccurred}
        onRetry={() => refetch()}
        variant="card"
      />
    )
  }

  const themes = data ?? []

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{messages.themes.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{messages.themes.subtitle}</p>
        </div>
        <Button asChild>
          <Link to={routes.admin.themeNew}>
            <Plus className="mr-2 h-4 w-4" />
            {messages.themes.newTheme}
          </Link>
        </Button>
      </div>

      {themes.length === 0 ? (
        <EmptyState
          icon={Palette}
          title={messages.themes.emptyTitle}
          description={messages.themes.emptyDescription}
          variant="card"
          action={
            <Button asChild>
              <Link to={routes.admin.themeNew}>
                <Plus className="mr-2 h-4 w-4" />
                {messages.themes.newTheme}
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {themes.map((theme) => (
            <ThemeCard key={theme.id} theme={theme} />
          ))}
        </div>
      )}
    </div>
  )
}

function ThemeLibrarySkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <Skeleton className="h-14 w-full rounded-none" />
            <div className="space-y-2 p-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
