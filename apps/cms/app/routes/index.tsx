import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: IndexPage,
})

function IndexPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-primary">Halo Efekt CMS</h1>
        <p className="mt-2 text-muted-foreground">TanStack Start — Scaffold OK</p>
      </div>
    </div>
  )
}
