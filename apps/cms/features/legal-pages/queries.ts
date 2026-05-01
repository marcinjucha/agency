// TanStack Query key factory
export const legalPageKeys = {
  all: ['legal-pages'] as const,
  detail: (id: string) => ['legal-pages', id] as const,
}
