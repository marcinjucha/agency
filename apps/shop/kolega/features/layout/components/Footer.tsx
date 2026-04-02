import { messages } from '@/lib/messages'

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-border bg-background py-8">
      <div className="mx-auto max-w-7xl px-6 text-center">
        <p className="text-sm text-muted-foreground">
          &copy; {year} {messages.footer.copyright}. {messages.footer.rights}
        </p>
      </div>
    </footer>
  )
}
