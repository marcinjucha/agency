'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getBlogPosts, blogKeys } from '../queries'
import { deleteBlogPost } from '../actions'
import type { BlogPostListItem } from '../types'
import {
  Button,
  Badge,
  Card,
  Skeleton,
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  LoadingState,
  ErrorState,
  EmptyState,
} from '@agency/ui'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FileText, Plus, Pencil, Trash2, Clock, User } from 'lucide-react'

export function BlogPostList() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  const {
    data: posts,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: blogKeys.list,
    queryFn: getBlogPosts,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteBlogPost,
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: blogKeys.all })
      }
    },
  })

  if (isLoading) return <BlogPostListSkeleton />

  if (error) {
    return (
      <ErrorState
        title="Nie udalo sie zaladowac artykulow"
        message={error instanceof Error ? error.message : 'Wystapil blad'}
        onRetry={() => refetch()}
        variant="card"
      />
    )
  }

  if (!posts || posts.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="Nie masz jeszcze artykulow"
        description="Zacznij tworzyc tresc na bloga swojej firmy."
        variant="card"
        action={
          <Link href="/admin/blog/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Napisz pierwszy artykul
            </Button>
          </Link>
        }
      />
    )
  }

  // Extract unique categories for filter
  const categories = Array.from(
    new Set(posts.map((p) => p.category).filter(Boolean))
  ) as string[]

  const filteredPosts =
    categoryFilter === 'all'
      ? posts
      : posts.filter((p) => p.category === categoryFilter)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-foreground">Blog</h1>
        <div className="flex items-center gap-3">
          {categories.length > 0 && (
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Kategoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Link href="/admin/blog/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nowy artykul
            </Button>
          </Link>
        </div>
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredPosts.map((post) => (
          <BlogPostCard
            key={post.id}
            post={post}
            onNavigate={() => router.push(`/admin/blog/${post.id}`)}
            onDelete={() => deleteMutation.mutate(post.id)}
            isDeleting={deleteMutation.isPending}
          />
        ))}
      </div>

      {/* Footer count */}
      <p className="text-xs text-muted-foreground">
        {filteredPosts.length} z {posts.length}{' '}
        {posts.length === 1 ? 'artykul' : 'artykulow'}
      </p>
    </div>
  )
}

// --- Card ---

function BlogPostCard({
  post,
  onNavigate,
  onDelete,
  isDeleting,
}: {
  post: BlogPostListItem
  onNavigate: () => void
  onDelete: () => void
  isDeleting: boolean
}) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return null
    try {
      return new Date(dateString).toLocaleDateString('pl-PL', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    } catch {
      return null
    }
  }

  return (
    <Card
      className="group flex flex-col overflow-hidden transition-shadow duration-200 hover:shadow-lg cursor-pointer"
      onClick={onNavigate}
    >
      {/* Cover image / placeholder */}
      <div className="relative aspect-video overflow-hidden bg-muted">
        {post.cover_image_url ? (
          <img
            src={post.cover_image_url}
            alt={post.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 via-primary/5 to-muted">
            <FileText className="h-10 w-10 text-muted-foreground/40" aria-hidden="true" />
          </div>
        )}

        {/* Status badge overlay */}
        <div className="absolute top-3 right-3">
          {post.is_published ? (
            <Badge className="bg-primary/90 text-primary-foreground border-0 shadow-sm">
              Opublikowany
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-muted/90 shadow-sm">
              Szkic
            </Badge>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4 space-y-3">
        {/* Category */}
        {post.category && (
          <Badge variant="outline" className="w-fit text-xs">
            {post.category}
          </Badge>
        )}

        {/* Title */}
        <h3 className="text-base font-semibold text-foreground line-clamp-2 leading-snug">
          {post.title}
        </h3>

        {/* Excerpt */}
        {post.excerpt && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {post.excerpt}
          </p>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {post.author_name && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" aria-hidden="true" />
              {post.author_name}
            </span>
          )}
          {post.estimated_reading_time != null && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" aria-hidden="true" />
              {post.estimated_reading_time} min czytania
            </span>
          )}
          {post.is_published && post.published_at && (
            <span>{formatDate(post.published_at)}</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 border-t border-border pt-3">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation()
              onNavigate()
            }}
          >
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Edytuj
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={(e) => e.stopPropagation()}
                disabled={isDeleting}
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="sr-only">Usun artykul</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
              <AlertDialogHeader>
                <AlertDialogTitle>Usunac artykul?</AlertDialogTitle>
                <AlertDialogDescription>
                  Artykul &quot;{post.title}&quot; zostanie trwale usuniety. Tej
                  operacji nie mozna cofnac.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Anuluj</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Usun
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </Card>
  )
}

// --- Skeleton ---

function BlogPostListSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-10 w-36" />
      </div>

      {/* Card grid skeleton */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <Skeleton className="aspect-video w-full" />
            <div className="p-4 space-y-3">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <div className="flex gap-4 pt-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-24" />
              </div>
              <div className="flex gap-2 pt-3 border-t border-border">
                <Skeleton className="h-8 flex-1" />
                <Skeleton className="h-8 w-8" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
