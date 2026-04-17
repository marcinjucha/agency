import { useState } from 'react'
import { messages } from '@/lib/messages'

export function AuthorBio() {
  const [photoVisible, setPhotoVisible] = useState(true)

  return (
    <section
      aria-labelledby="author-name"
      className="mx-auto max-w-5xl px-6 py-16 sm:py-24 md:py-32"
    >
      <div className="flex flex-col gap-12 md:flex-row md:items-start md:gap-16">
        {/* Photo */}
        {photoVisible && (
          <div className="shrink-0 md:sticky md:top-24 md:w-[280px]">
            <img
              src="/jacek.jpg"
              alt={messages.about.photoAlt}
              onError={() => setPhotoVisible(false)}
              className="aspect-[3/4] w-full rounded-lg object-cover object-top shadow-lg shadow-black/40 md:w-[280px]"
            />
          </div>
        )}

        {/* Bio text */}
        <div className={`flex flex-col gap-6 ${photoVisible ? '' : 'md:max-w-2xl'}`}>
          <header>
            <p className="mb-2 text-xs font-medium uppercase tracking-widest text-primary">
              {messages.about.label}
            </p>
            <h1
              id="author-name"
              className="font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl"
            >
              {messages.about.name}
            </h1>
          </header>

          {/* Intro paragraphs */}
          <div className="flex flex-col gap-4">
            {messages.about.intro.map((paragraph) => (
              <p
                key={paragraph}
                className="text-base leading-relaxed text-muted-foreground sm:text-lg"
              >
                {paragraph}
              </p>
            ))}
          </div>

          {/* Books — chronological list */}
          <div className="flex flex-col gap-3 border-l-2 border-primary/40 pl-6">
            <p className="text-sm font-medium text-foreground sm:text-base">
              {messages.about.booksIntro}
            </p>
            <ul className="flex flex-col gap-2">
              {messages.about.books.map((book) => (
                <li
                  key={book}
                  className="text-sm leading-relaxed text-muted-foreground sm:text-base"
                >
                  <span aria-hidden className="mr-2 text-primary">
                    •
                  </span>
                  {book}
                </li>
              ))}
            </ul>
          </div>

          {/* Closing paragraphs */}
          <div className="flex flex-col gap-4">
            {messages.about.closing.map((paragraph) => (
              <p
                key={paragraph}
                className="text-base leading-relaxed text-muted-foreground sm:text-lg"
              >
                {paragraph}
              </p>
            ))}
          </div>

          {/* Motto */}
          <figure className="mt-4 flex flex-col gap-3 rounded-lg border border-border bg-card/50 px-6 py-5">
            <figcaption className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              {messages.about.mottoLabel}
            </figcaption>
            <blockquote className="font-serif text-lg italic leading-relaxed text-foreground sm:text-xl">
              {messages.about.mottoQuote}
            </blockquote>
            <p className="text-xs text-muted-foreground">
              {messages.about.mottoSource}
            </p>
          </figure>
        </div>
      </div>
    </section>
  )
}
