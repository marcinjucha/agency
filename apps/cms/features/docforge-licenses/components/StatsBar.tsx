'use client'

import { Card, CardContent } from '@agency/ui'
import { messages } from '@/lib/messages'
import type { License } from '../types'
import { computeLicenseStatus } from '../utils'

interface StatsBarProps {
  licenses: License[]
}

type StatItem = {
  label: string
  value: number
  dotColor: string
}

function computeStats(licenses: License[]): StatItem[] {
  let active = 0
  let expired = 0
  let totalSeats = 0

  for (const license of licenses) {
    const status = computeLicenseStatus(license)
    if (status === 'active') active++
    if (status === 'expired') expired++
    totalSeats += license.max_seats
  }

  return [
    { label: messages.docforgeLicenses.statsTotal, value: licenses.length, dotColor: 'bg-foreground' },
    { label: messages.docforgeLicenses.statsActive, value: active, dotColor: 'bg-emerald-400' },
    { label: messages.docforgeLicenses.statsExpired, value: expired, dotColor: 'bg-amber-400' },
    { label: messages.docforgeLicenses.statsSeats, value: totalSeats, dotColor: 'bg-blue-400' },
  ]
}

export function StatsBar({ licenses }: StatsBarProps) {
  const stats = computeStats(licenses)

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="flex items-center gap-3 p-4">
            <span className={`h-2 w-2 rounded-full shrink-0 ${stat.dotColor}`} aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-xl font-semibold text-foreground">{stat.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
