import { createFileRoute } from '@tanstack/react-router'
import { AuthorBio } from '@/features/home/components/AuthorBio'

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'Jacek Jucha — Autorskie publikacje' },
      {
        name: 'description',
        content:
          'Pisarz, edukator i pasjonat literatury. Autorskie publikacje i materiały edukacyjne.',
      },
    ],
  }),
  component: HomePage,
})

function HomePage() {
  return (
    <main>
      <AuthorBio />
    </main>
  )
}
