'use client'

import { Tabs, TabsList, TabsTrigger } from '@agency/ui'
import type { MediaType } from '../types'

type MediaTypeFilterProps = {
  value: MediaType | undefined
  onChange: (value: MediaType | undefined) => void
}

export function MediaTypeFilter({ value, onChange }: MediaTypeFilterProps) {
  const tabValue = value ?? 'all'

  return (
    <Tabs
      value={tabValue}
      onValueChange={(v) => onChange(v === 'all' ? undefined : (v as MediaType))}
    >
      <TabsList>
        <TabsTrigger value="all">Wszystko</TabsTrigger>
        <TabsTrigger value="image">Obrazy</TabsTrigger>
        <TabsTrigger value="video">Wideo</TabsTrigger>
        <TabsTrigger value="youtube">YouTube</TabsTrigger>
        <TabsTrigger value="vimeo">Vimeo</TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
