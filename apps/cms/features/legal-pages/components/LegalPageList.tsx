'use client'

import { useQuery } from '@tanstack/react-query'
import { getLegalPages, legalPageKeys } from '../queries'
import { Badge, LoadingState, ErrorState, EmptyState } from '@agency/ui'
import Link from 'next/link'
import { Scale, Pencil } from 'lucide-react'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'

export function LegalPageList() {
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
      {pages.map((page) => (
        <Link
          key={page.id}
          href={routes.admin.legalPage(page.id)}
          className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-muted transition-colors"
        >
          <div className="flex items-center gap-3">
            <Scale size={18} className="text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">{page.title}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(page.updated_at).toLocaleDateString('pl-PL')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant={page.is_published ? 'default' : 'secondary'}>
              {page.is_published ? messages.legalPages.published : messages.legalPages.draft}
            </Badge>
            <Pencil size={16} className="text-muted-foreground" />
          </div>
        </Link>
      ))}
    </div>
  )
}
