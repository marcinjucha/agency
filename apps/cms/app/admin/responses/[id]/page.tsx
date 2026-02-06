import { ResponseDetail } from '@/features/responses/components/ResponseDetail'
import Link from 'next/link'
import { Button } from '@agency/ui'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Response Details | Legal-Mind CMS',
  description: 'View detailed client response information',
}

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function ResponsePage({ params }: PageProps) {
  const { id } = await params

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/responses">
          <Button variant="ghost" className="mb-4 -ml-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to responses
          </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Response Details
        </h1>
      </div>
      <ResponseDetail responseId={id} />
    </div>
  )
}
