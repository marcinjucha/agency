import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { messages } from '@/lib/messages'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get basic stats
  const { count: surveysCount } = await supabase
    .from('surveys')
    .select('*', { count: 'exact', head: true })

  const { count: responsesCount } = await supabase
    .from('responses')
    .select('*', { count: 'exact', head: true })

  const { count: appointmentsCount } = await supabase
    .from('appointments')
    .select('*', { count: 'exact', head: true })

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">{messages.dashboard.title}</h1>
        <p className="text-muted-foreground mt-2">{messages.dashboard.welcomeBack(user.email!)}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
          <h3 className="text-muted-foreground text-sm font-medium">{messages.dashboard.totalSurveys}</h3>
          <p className="text-3xl font-bold text-foreground mt-2">{surveysCount || 0}</p>
          <p className="text-muted-foreground text-sm mt-1">{messages.dashboard.activeForms}</p>
        </div>

        <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
          <h3 className="text-muted-foreground text-sm font-medium">{messages.dashboard.totalResponses}</h3>
          <p className="text-3xl font-bold text-foreground mt-2">{responsesCount || 0}</p>
          <p className="text-muted-foreground text-sm mt-1">{messages.dashboard.clientSubmissions}</p>
        </div>

        <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
          <h3 className="text-muted-foreground text-sm font-medium">{messages.dashboard.appointments}</h3>
          <p className="text-3xl font-bold text-foreground mt-2">{appointmentsCount || 0}</p>
          <p className="text-muted-foreground text-sm mt-1">{messages.dashboard.scheduledMeetings}</p>
        </div>
      </div>

      <div className="mt-8 bg-card p-6 rounded-lg shadow-sm border border-border">
        <h2 className="text-xl font-semibold text-foreground mb-4">{messages.dashboard.gettingStarted}</h2>
        <div className="space-y-3 text-muted-foreground">
          <p>{messages.dashboard.welcomeMessage}</p>
          <p>
            1. {messages.dashboard.step1} <span className="font-semibold">{messages.dashboard.step1Bold}</span>
          </p>
          <p>
            2. {messages.dashboard.step2}
          </p>
          <p>
            3. {messages.dashboard.step3}{' '}
            <span className="font-semibold">{messages.dashboard.step3Bold}</span>
          </p>
          <p>
            4. {messages.dashboard.step4}{' '}
            <span className="font-semibold">{messages.dashboard.step4Bold}</span>
          </p>
        </div>
      </div>
    </div>
  )
}
