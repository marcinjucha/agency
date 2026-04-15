import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Clock, BookOpen } from 'lucide-react'
import type { WebsiteBlogListItem } from '../types'
import { formatPolishDate } from '../utils'
import { routes } from '@/lib/routes'

function CoverImage({
  src,
  alt,
  priority = false,
}: {
  src: string | null
  alt: string
  priority?: boolean
}) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        width={800}
        height={450}
        loading={priority ? 'eager' : 'lazy'}
        className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
      />
    )
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
      <span className="text-6xl font-bold text-primary/20 select-none">
        {alt.charAt(0)}
      </span>
    </div>
  )
}

function PostMeta({
  post,
  size = 'sm',
}: {
  post: WebsiteBlogListItem
  size?: 'sm' | 'base'
}) {
  const textClass = size === 'base' ? 'text-sm' : 'text-xs'

  return (
    <div
      className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${textClass} text-muted-foreground`}
    >
      {post.published_at && (
        <time dateTime={post.published_at}>
          {formatPolishDate(post.published_at)}
        </time>
      )}
      {post.estimated_reading_time && (
        <>
          <span className="text-border" aria-hidden="true">
            &middot;
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" aria-hidden="true" />
            {post.estimated_reading_time} min
          </span>
        </>
      )}
    </div>
  )
}

function CategoryPill({
  category,
  variant = 'overlay',
}: {
  category: string
  variant?: 'overlay' | 'inline'
}) {
  if (variant === 'overlay') {
    return (
      <span className="rounded-full bg-background/90 px-3 py-1 text-xs font-medium text-foreground backdrop-blur-sm shadow-sm">
        {category}
      </span>
    )
  }

  return (
    <span className="rounded-full bg-primary/8 px-3 py-1 text-xs font-medium text-primary">
      {category}
    </span>
  )
}

function FeaturedPostCard({ post }: { post: WebsiteBlogListItem }) {
  return (
    <Link to={routes.blogPost(post.slug)} className="group block">
      <article className="relative overflow-hidden rounded-2xl bg-muted/40 transition-all duration-300 hover:bg-muted/60">
        <div className="grid md:grid-cols-[1.2fr_1fr]">
          {/* Image */}
          <div className="relative aspect-[16/9] overflow-hidden md:aspect-[4/3]">
            <CoverImage src={post.cover_image_url} alt={post.title} priority />
            <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            {post.category && (
              <div className="absolute left-4 top-4">
                <CategoryPill category={post.category} />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex flex-col justify-center gap-4 p-6 md:p-10">
            {post.author_name && (
              <p className="text-sm font-medium text-muted-foreground">
                {post.author_name}
              </p>
            )}
            <h2 className="text-2xl font-bold leading-tight tracking-tight text-foreground md:text-3xl lg:text-[2rem]">
              {post.title}
            </h2>
            {post.excerpt && (
              <p className="text-base leading-relaxed text-muted-foreground line-clamp-3">
                {post.excerpt}
              </p>
            )}
            <div className="flex items-center justify-between pt-2">
              <PostMeta post={post} size="base" />
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-2">
                Czytaj
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </div>
          </div>
        </div>
      </article>
    </Link>
  )
}

function PostCard({ post }: { post: WebsiteBlogListItem }) {
  return (
    <Link to={routes.blogPost(post.slug)} className="group block h-full">
      <article className="flex h-full flex-col overflow-hidden rounded-xl bg-muted/30 transition-all duration-300 hover:bg-muted/50">
        {/* Image */}
        <div className="relative aspect-[16/9] overflow-hidden">
          <CoverImage src={post.cover_image_url} alt={post.title} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          {post.category && (
            <div className="absolute left-3 top-3">
              <CategoryPill category={post.category} />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col p-5 sm:p-6">
          <div className="mb-3">
            <PostMeta post={post} />
          </div>
          <h2 className="mb-2 text-lg font-semibold leading-snug tracking-tight text-foreground line-clamp-2">
            {post.title}
          </h2>
          {post.excerpt && (
            <p className="mb-4 flex-1 text-sm leading-relaxed text-muted-foreground line-clamp-3">
              {post.excerpt}
            </p>
          )}
          <div className="mt-auto flex items-center gap-1.5 text-sm font-medium text-primary opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-2">
            Czytaj dalej
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </div>
        </div>
      </article>
    </Link>
  )
}

type BlogListPageProps = {
  posts: WebsiteBlogListItem[]
}

export function BlogListPage({ posts }: BlogListPageProps) {
  const categories = Array.from(
    new Set(posts.map((p) => p.category).filter(Boolean))
  ) as string[]
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const filteredPosts = activeCategory
    ? posts.filter((p) => p.category === activeCategory)
    : posts

  const [featured, ...rest] = filteredPosts

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden pb-16 pt-28 md:pb-20 md:pt-36">
        {/* Background decoration */}
        <div
          className="pointer-events-none absolute -top-32 right-0 h-[500px] w-[500px] rounded-full bg-primary/5 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-20 left-0 h-[300px] w-[300px] rounded-full bg-primary/3 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <p className="mb-4 text-sm font-medium uppercase tracking-wider text-primary">
            Blog
          </p>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl">
            {`Wiedza, kt\u00f3ra nap\u0119dza Tw\u00f3j biznes`}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
            {`Artyku\u0142y o AI, automatyzacji i optymalizacji proces\u00f3w biznesowych. Praktyczne wskaz\u00f3wki, kt\u00f3re mo\u017cesz wdro\u017cy\u0107 od razu.`}
          </p>
        </div>
      </section>

      {/* Content */}
      <div className="mx-auto max-w-5xl px-4 pb-24 sm:px-6 lg:px-8">
        {/* Category filters */}
        {categories.length > 0 && (
          <nav
            className="mb-12 flex flex-wrap gap-2"
            role="tablist"
            aria-label={`Filtruj artyku\u0142y po kategorii`}
          >
            <button
              role="tab"
              aria-selected={activeCategory === null}
              onClick={() => setActiveCategory(null)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                activeCategory === null
                  ? 'bg-foreground text-background shadow-sm'
                  : 'bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              Wszystkie
            </button>
            {categories.map((category) => (
              <button
                key={category}
                role="tab"
                aria-selected={activeCategory === category}
                onClick={() => setActiveCategory(category)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  activeCategory === category
                    ? 'bg-foreground text-background shadow-sm'
                    : 'bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {category}
              </button>
            ))}
          </nav>
        )}

        {/* Posts */}
        {filteredPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/60">
              <BookOpen
                className="h-8 w-8 text-muted-foreground/50"
                aria-hidden="true"
              />
            </div>
            <p className="text-lg font-medium text-foreground">
              {`Wkr\u00f3tce pojawi\u0105 si\u0119 tutaj artyku\u0142y`}
            </p>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              {`Pracujemy nad nowymi tre\u015bciami. Wracaj regularnie, \u017ceby nie przegapi\u0107 nowych publikacji.`}
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Featured post */}
            {featured && <FeaturedPostCard post={featured} />}

            {/* Divider between featured and grid */}
            {rest.length > 0 && (
              <div className="border-t border-border" aria-hidden="true" />
            )}

            {/* Grid */}
            {rest.length > 0 && (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 sm:gap-8">
                {rest.map((post) => (
                  <PostCard key={post.slug} post={post} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
