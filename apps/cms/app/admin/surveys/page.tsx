'use client'

import { SurveyList } from '@/features/surveys/components/SurveyList'
import { Button } from '@agency/ui'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { messages } from '@/lib/messages'

export default function SurveysPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{messages.pages.surveysTitle}</h1>
          <p className="text-muted-foreground mt-1">{messages.pages.surveysDescription}</p>
        </div>
        <Link href="/admin/surveys/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {messages.pages.createSurvey}
          </Button>
        </Link>
      </div>

      <SurveyList />
    </div>
  )
}
