import { createFileRoute } from '@tanstack/react-router'
import { buildCmsHead } from '@/lib/head'
import { messages } from '@/lib/messages'
import { getLandingPageFn, updateLandingCtaFn } from '@/features/landing/server'
import { queryKeys } from '@/lib/query-keys'
import { LandingPageEditor } from '@/features/landing/components/LandingPageEditor'
import { useQuery, useQueryClient } from '@tanstack/react-query'

export const Route = createFileRoute('/admin/landing-page/')({
  head: () => buildCmsHead(messages.nav.landingPage),
  component: LandingPageRoute,
})

function LandingPageRoute() {
  const queryClient = useQueryClient()
  const {
    data: page,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.landing.all,
    queryFn: () => getLandingPageFn(),
  })

  async function handleSave(id: string, cta_url: string) {
    const result = await updateLandingCtaFn({ data: { id, cta_url } })
    if (result.success) {
      queryClient.invalidateQueries({ queryKey: queryKeys.landing.all })
    }
    return result
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {messages.nav.landingPage}
        </h1>
      </div>
      <LandingPageEditor
        page={page}
        isLoading={isLoading}
        error={error}
        saveFn={handleSave}
      />
    </div>
  )
}
