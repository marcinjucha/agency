import type { WebsiteLegalPage } from '../types'

type LegalPageContentProps = {
  page: WebsiteLegalPage
}

export function LegalPageContent({ page }: LegalPageContentProps) {
  return (
    <div className="min-h-screen bg-background">
      <article className="pb-16 pt-24 md:pt-32">
        <header className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl">
            {page.title}
          </h1>
        </header>

        {page.html_body && (
          <div className="mx-auto mt-12 max-w-4xl px-4 sm:px-6 lg:px-8">
            <div
              className="blog-prose"
              dangerouslySetInnerHTML={{ __html: page.html_body }}
            />
          </div>
        )}
      </article>
    </div>
  )
}
