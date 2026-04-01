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
        <p>{messages.about.paragraph1}</p>
        <p>{messages.about.paragraph2}</p>
      </div>
    </main>
  )
}
