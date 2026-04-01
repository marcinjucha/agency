import type { Metadata } from 'next'
import { messages } from '@/lib/messages'

export const metadata: Metadata = {
  title: messages.about.title,
  description: messages.about.description,
}

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        {messages.about.title}
      </h1>
      <div className="mt-8 space-y-6 text-base leading-relaxed text-muted-foreground">
        <p>{messages.about.description}</p>
        <p>
          Wierzę, że dobra literatura nie musi być trudna — wystarczy, że jest
          szczera. Moje książki powstają z codziennych obserwacji, rozmów
          i&nbsp;ciszy, która pozwala usłyszeć to, co naprawdę ważne.
        </p>
        <p>
          Materiały edukacyjne, które tworzę, są dostępne bezpłatnie — bo wiedza
          powinna być dostępna dla każdego.
        </p>
      </div>
    </main>
  )
}
