import { createFileRoute } from '@tanstack/react-router'
import { messages } from '@/lib/messages'

export const Route = createFileRoute('/kontakt')({
  head: () => ({
    meta: [
      { title: messages.contact.title + ' | Książki Jacka' },
      { name: 'description', content: messages.contact.description },
    ],
  }),
  component: ContactPage,
})

function ContactPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        {messages.contact.title}
      </h1>
      <p className="mt-6 text-base leading-relaxed text-muted-foreground">
        {messages.contact.description}
      </p>
      <div className="mt-8 rounded-lg border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">E-mail</p>
        <a
          href={`mailto:${messages.contact.email}`}
          className="mt-1 block text-lg font-medium text-primary hover:underline"
        >
          {messages.contact.email}
        </a>
      </div>
    </main>
  )
}
