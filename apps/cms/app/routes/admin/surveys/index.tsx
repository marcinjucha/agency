import { createFileRoute } from '@tanstack/react-router'
import { Link } from '@tanstack/react-router'
import { SurveyList } from '@/features/surveys/components/SurveyList'
import { Button } from '@agency/ui'
import { Plus } from 'lucide-react'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'
import { buildCmsHead } from '@/lib/head'

export const Route = createFileRoute('/admin/surveys/')({
  head: () => buildCmsHead(messages.nav.surveys),
  component: SurveysPage,
})

function SurveysPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{messages.pages.surveysTitle}</h1>
          <p className="text-muted-foreground mt-1">{messages.pages.surveysDescription}</p>
        </div>
        <Link to={routes.admin.surveyNew}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {messages.pages.createSurvey}
          </Button>
        </Link>
      </div>
      <SurveyList />
    </div>
  )
}
