import { ResponseList } from '@/features/responses/components/ResponseList'

export const metadata = {
  title: 'Client Responses | Legal-Mind CMS',
  description: 'View and manage client survey responses',
}

export default function ResponsesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Client Responses
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          View and manage all client responses to your surveys.
        </p>
      </div>
      <ResponseList />
    </div>
  )
}
