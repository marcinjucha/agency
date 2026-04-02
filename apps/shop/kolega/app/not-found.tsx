import Link from 'next/link'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'

export default function NotFound() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <p className="text-6xl font-bold text-primary">404</p>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">
        {messages.notFound.title}
      </h1>
      <p className="mt-2 text-base text-muted-foreground">
        {messages.notFound.description}
      </p>
      <Link
        href={routes.home}
        className="mt-8 inline-flex items-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        {messages.notFound.backHome}
      </Link>
    </main>
  )
}
