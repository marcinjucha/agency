type Props = {
  page: { title: string; html_body: string | null }
}

export function LegalPageContent({ page }: Props) {
  return (
    <div className="min-h-screen bg-background">
      <article className="pb-16 pt-24 md:pt-32">
        <header className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {page.title}
          </h1>
        </header>
        {page.html_body && (
          <div className="mx-auto mt-12 max-w-4xl px-4 sm:px-6">
            <div
              className="product-prose"
              dangerouslySetInnerHTML={{ __html: page.html_body }}
            />
          </div>
        )}
      </article>
    </div>
  )
}
