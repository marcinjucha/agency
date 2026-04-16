import { createFileRoute } from '@tanstack/react-router'
import { buildCmsHead } from '@/lib/head'
import { messages } from '@/lib/messages'
import { getLandingPageFn } from '@/features/landing/server'
import { queryKeys } from '@/lib/query-keys'
import { LandingPageEditor } from '@/features/landing/components/LandingPageEditor'

export const Route = createFileRoute('/admin/landing-page/')({
  head: () => buildCmsHead(messages.nav.landingPage),
  loader: ({ context: { queryClient } }) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.landing.all,
      queryFn: () => getLandingPageFn(),
    })
  },
  component: LandingPageRoute,
})

function LandingPageRoute() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {messages.nav.landingPage}
        </h1>
      </div>
      <LandingPageEditor />
    </div>
  )
}
