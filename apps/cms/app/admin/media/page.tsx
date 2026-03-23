import type { Metadata } from 'next'
import { MediaLibrary } from '@/features/media/components'

export const metadata: Metadata = {
  title: 'Biblioteka mediów | Halo-Efekt CMS',
}

export default function MediaPage() {
  return <MediaLibrary />
}
