import { LandingPageEditor } from '@/features/landing/components/LandingPageEditor'

export const metadata = { title: 'Landing Page — CMS' }

export default function LandingPagePage() {
  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Landing Page</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Edytuj sekcje strony haloefekt.pl
        </p>
      </div>
      <LandingPageEditor />
    </div>
  )
}
