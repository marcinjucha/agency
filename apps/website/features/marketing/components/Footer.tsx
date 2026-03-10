import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n.config'

export async function Footer() {
  const t = await getTranslations('footer')

  return (
    <footer className="bg-card border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          {/* Brand + Description */}
          <div className="max-w-sm">
            <Link href="/" className="text-xl font-bold text-foreground">
              Halo Efekt
            </Link>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              {t('description')}
            </p>
          </div>

          {/* Legal Links */}
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#privacy" className="hover:text-foreground transition-colors">
              {t('privacy')}
            </a>
            <a href="#terms" className="hover:text-foreground transition-colors">
              {t('terms')}
            </a>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground text-center">
            {t('copyright')}
          </p>
        </div>
      </div>
    </footer>
  )
}
