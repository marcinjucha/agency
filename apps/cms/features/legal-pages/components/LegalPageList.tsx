

import { useQuery } from '@tanstack/react-query'
import { getLegalPages, legalPageKeys } from '../queries'
import { Badge, Card, CardContent, LoadingState, ErrorState, EmptyState } from '@agency/ui'
import { Link } from '@tanstack/react-router'
import { Scale, Pencil } from 'lucide-react'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'
import { useViewMode } from '@/hooks/use-view-mode'
import { ViewModeToggle } from '@/components/shared/ViewModeToggle'

export function LegalPageList() {
  const [viewMode, setViewMode] = useViewMode('legal-pages-view-mode', 'grid')

  const {
    data: pages,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: legalPageKeys.all,
    queryFn: getLegalPages,
  })

  if (isLoading) return <LoadingState variant="skeleton-table" rows={3} />
  if (error) return <ErrorState title={messages.common.errorOccurred} message={error.message} onRetry={() => refetch()} />
  if (!pages?.length) return <EmptyState icon={Scale} title={messages.legalPages.empty} description={messages.legalPages.emptyDescription} />

  return (
    <div className="space-y-4">
      {/* View toggle */}
      <div className="flex justify-end">
        <ViewModeToggle value={viewMode} onChange={setViewMode} />
      </div>

      {viewMode === 'grid' ? (
        /* Gallery view */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {pages.map((page) => (
            <Link key={page.id} to={routes.admin.legalPage(page.id)}>
              <Card className="overflow-hidden transition-transform hover:-translate-y-0.5 focus-within:ring-2 focus-within:ring-ring h-full">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <Scale className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" aria-hidden="true" />
                    <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2">{page.title}</p>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant={page.is_published ? 'default' : 'secondary'} className="text-xs">
                      {page.is_published ? messages.legalPages.published : messages.legalPages.draft}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(page.updated_at).toLocaleDateString('pl-PL')}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        /* List view */
        <div className="rounded-lg border border-border overflow-hidden">
          {pages.map((page, index) => (
            <Link
              key={page.id}
              to={routes.admin.legalPage(page.id)}
              className={`flex items-center justify-between px-4 py-2.5 bg-card hover:bg-muted/60 transition-colors ${
                index < pages.length - 1 ? 'border-b border-border' : ''
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Scale size={15} className="text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">{page.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(page.updated_at).toLocaleDateString('pl-PL')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <Badge variant={page.is_published ? 'default' : 'secondary'}>
                  {page.is_published ? messages.legalPages.published : messages.legalPages.draft}
                </Badge>
                <Pencil size={14} className="text-muted-foreground" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
