import { ResponseDetail } from '@/features/responses/components/ResponseDetail'
import Link from 'next/link'
import { Button } from '@agency/ui'
import { ArrowLeft } from 'lucide-react'
import { routes } from '@/lib/routes'
import { messages } from '@/lib/messages'

export const metadata = {
  title: messages.pages.responseDetailMetaTitle,
  description: messages.pages.responseDetailMetaDescription,
}

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function ResponsePage({ params }: PageProps) {
  const { id } = await params

  return (
    <div className="space-y-6">
      <div>
        <Link href={routes.admin.intake}>
          <Button variant="ghost" className="mb-4 -ml-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {messages.pages.backToIntake}
          </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {messages.pages.responseDetailTitle}
        </h1>
      </div>
      <ResponseDetail responseId={id} />
    </div>
  )
}
