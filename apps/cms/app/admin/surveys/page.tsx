import { SurveyList } from '@/features/surveys/components/SurveyList'
import { Button } from '@legal-mind/ui'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export default function SurveysPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Surveys</h1>
          <p className="text-gray-600 mt-1">Manage your client intake forms</p>
        </div>
        <Link href="/admin/surveys/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Survey
          </Button>
        </Link>
      </div>

      <SurveyList />
    </div>
  )
}
