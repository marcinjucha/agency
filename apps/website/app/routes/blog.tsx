import { createFileRoute, Outlet } from '@tanstack/react-router'

// Pathless layout for /blog/* routes.
// Renders an Outlet — blog pages render their own Navbar/Footer via their components.
// No URL segment added (the route path 'blog' matches the /blog prefix for child routes).

export const Route = createFileRoute('/blog')({
  component: BlogLayout,
})

function BlogLayout() {
  return <Outlet />
}
