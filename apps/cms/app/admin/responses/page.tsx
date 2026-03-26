import { ResponseList } from '@/features/responses/components/ResponseList'

export const metadata = {
  title: 'Odpowiedzi klientów | Halo-Efekt CMS',
  description: 'Przeglądaj odpowiedzi klientów',
}

export default function ResponsesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Odpowiedzi klientów
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Przeglądaj i zarządzaj odpowiedziami klientów na Twoje ankiety.
        </p>
      </div>
      <ResponseList />
    </div>
  )
}
