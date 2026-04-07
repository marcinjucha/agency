import { TenantForm } from '@/features/tenants/components/TenantForm'

export default async function EditTenantPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <TenantForm tenantId={id} />
}
