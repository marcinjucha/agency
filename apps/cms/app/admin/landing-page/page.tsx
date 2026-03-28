import { LandingPageEditor } from '@/features/landing/components/LandingPageEditor'

export const metadata = { title: 'Strona główna — CMS' }

export default function LandingPagePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Strona główna</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Edytuj sekcje strony haloefekt.pl
        </p>
      </div>
      <LandingPageEditor />
    </div>
  )
}
