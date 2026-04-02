import type { Metadata } from 'next'
import { messages } from '@/lib/messages'

export const metadata: Metadata = {
  title: messages.contact.title,
  description: messages.contact.description,
}

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        {messages.contact.title}
      </h1>
      <p className="mt-6 text-base leading-relaxed text-muted-foreground">
        {messages.contact.description}
      </p>

      <div className="mt-8 space-y-4">
        <div className="rounded-lg border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">{messages.contact.emailLabel}</p>
          <a
            href={`mailto:${messages.contact.email}`}
            className="mt-1 block text-lg font-medium text-primary hover:underline"
          >
            {messages.contact.email}
          </a>
        </div>
      </div>
    </main>
  )
}
