import { NextRequest, NextResponse } from 'next/server'
import { submitResponse } from '@/features/survey/submit'
import type { SurveyAnswers } from '@/features/survey/types'

interface SubmitBody {
  linkId: string
  surveyId: string
  answers: SurveyAnswers
}

export async function POST(request: NextRequest) {
  try {
    const body: SubmitBody = await request.json()
    const { linkId, surveyId, answers } = body

    const result = await submitResponse({ linkId, surveyId, answers })

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.httpStatus ?? 400 }
      )
    }

    return NextResponse.json({
      success: true,
      responseId: result.responseId,
      linkId: result.linkId,
    })
  } catch (error) {
    console.error('Unexpected error submitting survey:', error)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
