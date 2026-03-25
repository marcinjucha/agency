import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-8xl font-bold text-primary/20 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-foreground mb-3">
          Strona nie istnieje
        </h2>
        <p className="text-muted-foreground mb-8">
          Strona, której szukasz, nie istnieje lub została przeniesiona.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-6 py-3 text-sm font-semibold transition-all duration-200"
        >
          Wróć na stronę główną
        </Link>
      </div>
    </div>
  )
}
