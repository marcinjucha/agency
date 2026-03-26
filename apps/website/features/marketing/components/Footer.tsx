import Link from 'next/link'
import type { FooterBlock } from '@agency/database'
import { routes } from '@/lib/routes'

export function Footer({ description, privacy, terms, copyright }: FooterBlock) {
  return (
    <footer className="relative bg-background border-t border-border/30">
      {/* Subtle top gradient */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
          {/* Brand + Description */}
          <div className="max-w-sm">
            <Link href={routes.home} className="text-lg font-bold text-foreground hover:text-primary transition-colors duration-300">
              Halo Efekt
            </Link>
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
              {description}
            </p>
          </div>

          {/* Legal Links */}
          <div className="flex items-center gap-6 text-sm">
            <Link
              href={routes.politykaPrywatnosci}
              className="text-muted-foreground hover:text-foreground transition-colors duration-300"
            >
              {privacy}
            </Link>
            <Link
              href={routes.regulamin}
              className="text-muted-foreground hover:text-foreground transition-colors duration-300"
            >
              {terms}
            </Link>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border/30">
          <p className="text-xs text-muted-foreground/60">
            {copyright}
          </p>
        </div>
      </div>
    </footer>
  )
}
