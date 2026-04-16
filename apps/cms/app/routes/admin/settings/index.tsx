import { createFileRoute } from '@tanstack/react-router'
import { buildCmsHead } from '@/lib/head'
import { messages } from '@/lib/messages'
import { queryKeys } from '@/lib/query-keys'
import { siteSettingsKeys } from '@/features/site-settings/types'
import { getCalendarConnectionsFn, getCalendarSettingsFn } from '@/features/calendar/server'
import { getSiteSettingsFn, getKeywordPoolFn } from '@/features/site-settings/server'
import { CalendarConnectionList } from '@/features/calendar/components/CalendarConnectionList'
import { CalendarSettingsForm } from '@/features/calendar/components/CalendarSettingsForm'
import { SeoSettingsForm } from '@/features/site-settings/components/SeoSettingsForm'

export const Route = createFileRoute('/admin/settings/')({
  head: () => buildCmsHead(messages.nav.settings),
  loader: ({ context: { queryClient } }) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.calendar.connections,
      queryFn: async () => {
        const result = await getCalendarConnectionsFn()
        if (!result.success) throw new Error(result.error)
        return result.data
      },
    })
    queryClient.prefetchQuery({
      queryKey: queryKeys.calendar.settings,
      queryFn: async () => {
        const result = await getCalendarSettingsFn()
        if (!result.success) throw new Error(result.error)
        return result.data
      },
    })
    queryClient.prefetchQuery({
      queryKey: siteSettingsKeys.detail,
      queryFn: async () => {
        const result = await getSiteSettingsFn()
        if (!result.success) throw new Error(result.error)
        return result.data
      },
    })
    queryClient.prefetchQuery({
      queryKey: siteSettingsKeys.keywordPool,
      queryFn: async () => {
        const result = await getKeywordPoolFn()
        if (!result.success) throw new Error(result.error)
        return result.data
      },
    })
  },
  component: SettingsPage,
})

function SettingsPage() {
  return (
    <div className="space-y-10">
      <SettingsPageHeader />
      <CalendarSection />
      <SeoSection />
    </div>
  )
}

function SettingsPageHeader() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">{messages.nav.settings}</h1>
    </div>
  )
}

function CalendarSection() {
  return (
    <section className="space-y-6">
      <SectionHeading title={messages.calendar.connectionsTitle} />
      {/* CalendarConnectionList owns its own useQuery — cache pre-populated by loader */}
      <CalendarConnectionList />
      {/* CalendarSettingsForm owns its own useQuery — cache pre-populated by loader */}
      <CalendarSettingsForm />
    </section>
  )
}

function SeoSection() {
  return (
    <section className="space-y-6">
      <SectionHeading title={messages.siteSettings.organizationCard} />
      {/* SeoSettingsForm owns its own useQuery — cache pre-populated by loader */}
      <SeoSettingsForm />
    </section>
  )
}

function SectionHeading({ title }: { title: string }) {
  return (
    <div className="border-b border-border pb-3">
      <h2 className="text-lg font-semibold">{title}</h2>
    </div>
  )
}
