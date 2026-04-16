import { createFileRoute } from '@tanstack/react-router'
import { LicenseList } from '@/features/docforge-licenses/components/LicenseList'
import { buildCmsHead } from '@/lib/head'

export const Route = createFileRoute('/admin/docforge/licenses')({
  head: () => buildCmsHead('Licencje DocForge'),
  component: () => <LicenseList />,
})
