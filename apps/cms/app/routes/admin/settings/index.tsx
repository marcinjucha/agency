import { createFileRoute } from '@tanstack/react-router'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@agency/ui'
import { buildCmsHead } from '@/lib/head'
import { messages } from '@/lib/messages'
import { CalendarSettings } from '@/features/calendar/components/CalendarSettings'
import { CalendarSettingsForm } from '@/features/calendar/components/CalendarSettingsForm'
import { SeoSettingsForm } from '@/features/site-settings/components/SeoSettingsForm'

export const Route = createFileRoute('/admin/settings/')({
  head: () => buildCmsHead(messages.nav.settings),
  component: SettingsPage,
})

function SettingsPage() {
  return (
    <div className="space-y-8 pb-8">
      <div>
        <h1 className="text-2xl font-bold">{messages.pages.settingsTitle}</h1>
        <p className="text-muted-foreground mt-2">
          {messages.pages.settingsDescription}
        </p>
      </div>

      <Tabs defaultValue="seo">
        <TabsList>
          <TabsTrigger value="seo">{messages.siteSettings.tabSeo}</TabsTrigger>
          <TabsTrigger value="calendar">{messages.siteSettings.tabCalendar}</TabsTrigger>
        </TabsList>

        <TabsContent value="seo" className="mt-6">
          <SeoSettingsForm />
        </TabsContent>

        <TabsContent value="calendar" className="mt-6 space-y-8">
          <CalendarSettings />
          <CalendarSettingsForm />
        </TabsContent>
      </Tabs>
    </div>
  )
}
