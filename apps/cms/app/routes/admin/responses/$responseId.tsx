import { createFileRoute } from '@tanstack/react-router'
import { Link } from '@tanstack/react-router'
import { ResponseDetail } from '@/features/responses/components/ResponseDetail'
import { Button } from '@agency/ui'
import { ArrowLeft } from 'lucide-react'
import { buildCmsHead } from '@/lib/head'
import { messages } from '@/lib/messages'
import { routes } from '@/lib/routes'

export const Route = createFileRoute('/admin/responses/$responseId')({
  head: () => buildCmsHead(messages.pages.responseDetailTitle),
  component: ResponseDetailPage,
})

function ResponseDetailPage() {
  const { responseId } = Route.useParams()
  return (
    <div className="space-y-6">
      <div>
        <Link to={routes.admin.intake} search={{}}>
          <Button variant="ghost" className="mb-4 -ml-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {messages.pages.backToIntake}
          </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {messages.pages.responseDetailTitle}
        </h1>
      </div>
      <ResponseDetail responseId={responseId} />
    </div>
  )
}
