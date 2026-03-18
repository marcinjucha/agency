'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Badge } from '@agency/ui'
import type { WebsiteBlogPost } from '../types'
import { formatPolishDate } from '../utils'

type BlogArticlePageProps = {
  post: WebsiteBlogPost
  isPreview?: boolean
}

export function BlogArticlePage({ post, isPreview = false }: BlogArticlePageProps) {
  const [linkCopied, setLinkCopied] = useState(false)

  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.href)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Preview banner */}
      {isPreview && (
        <div className="border-b border-yellow-500/30 bg-yellow-500/10 py-3 text-center">
          <p className="text-sm font-medium text-yellow-300">
            {'Podgl\u0105d artyku\u0142u \u2014 ta wersja nie jest jeszcze opublikowana'}
          </p>
        </div>
      )}

      <article className="pb-16 pt-24 md:pt-32">
        {/* Article header */}
        <header className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          {post.category && (
            <Badge className="mb-6 bg-primary/10 text-primary hover:bg-primary/10">
              {post.category}
            </Badge>
          )}

          <h1 className="text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl md:text-5xl">
            {post.title}
          </h1>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {post.author_name && <span className="font-medium">{post.author_name}</span>}
            {post.author_name && post.published_at && (
              <span className="text-border" aria-hidden="true">&middot;</span>
            )}
            {post.published_at && (
              <time dateTime={post.published_at}>{formatPolishDate(post.published_at)}</time>
            )}
            {post.estimated_reading_time && (
              <>
                <span className="text-border" aria-hidden="true">&middot;</span>
                <span>{post.estimated_reading_time} min czytania</span>
              </>
            )}
          </div>
        </header>

        {/* Cover image */}
        {post.cover_image_url && (
          <div className="mx-auto mt-10 max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="overflow-hidden rounded-2xl shadow-lg">
              <Image
                src={post.cover_image_url}
                alt={post.title}
                width={1200}
                height={500}
                className="w-full max-h-[500px] object-cover"
                priority
              />
            </div>
          </div>
        )}

        {/* Article content */}
        {post.html_body && (
          <div className="mx-auto mt-12 max-w-[700px] px-4 sm:px-6 lg:px-8">
            <div
              className="blog-prose"
              dangerouslySetInnerHTML={{ __html: post.html_body }}
            />
          </div>
        )}

        {/* Article footer */}
        <div className="mx-auto mt-16 max-w-[700px] px-4 sm:px-6 lg:px-8">
          <hr className="border-border" />

          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-2 rounded-full bg-muted px-5 py-2.5 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-muted/80"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              {linkCopied ? 'Skopiowano!' : 'Udost\u0119pnij link'}
            </button>

            <Link
              href="/blog"
              className="text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground"
            >
              {'\u2190 Wr\u00f3\u0107 do bloga'}
            </Link>
          </div>
        </div>
      </article>
    </div>
  )
}
