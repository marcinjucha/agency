import { Link } from '@tanstack/react-router'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-border bg-background py-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-6 text-center sm:flex-row sm:justify-between sm:text-left">
        <p className="text-sm text-muted-foreground">
          &copy; {year} {messages.footer.copyright}. {messages.footer.rights}
        </p>
        <Link
          to={routes.politykaPrywatnosci}
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {messages.footer.privacyPolicy}
        </Link>
      </div>
    </footer>
  )
}
