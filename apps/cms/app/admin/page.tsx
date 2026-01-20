import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

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
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome back, {user.email}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-gray-500 text-sm font-medium">Total Surveys</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">{surveysCount || 0}</p>
          <p className="text-gray-400 text-sm mt-1">Active forms</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-gray-500 text-sm font-medium">Total Responses</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">{responsesCount || 0}</p>
          <p className="text-gray-400 text-sm mt-1">Client submissions</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-gray-500 text-sm font-medium">Appointments</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">{appointmentsCount || 0}</p>
          <p className="text-gray-400 text-sm mt-1">Scheduled meetings</p>
        </div>
      </div>

      <div className="mt-8 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Getting Started</h2>
        <div className="space-y-3 text-gray-600">
          <p>Welcome to Legal Mind CMS!</p>
          <p>
            1. Create your first survey in the <span className="font-semibold">Surveys</span> section
          </p>
          <p>
            2. Share the survey link with your clients
          </p>
          <p>
            3. View responses and AI qualification in the{' '}
            <span className="font-semibold">Responses</span> section
          </p>
          <p>
            4. Manage appointments in the <span className="font-semibold">Calendar</span> section
          </p>
        </div>
      </div>
    </div>
  )
}
