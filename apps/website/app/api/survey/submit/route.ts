import { NextRequest, NextResponse } from 'next/server'
import { createAnonClient } from '@/lib/supabase/anon-server'
import type { TablesInsert } from '@agency/database'

interface SubmitBody {
  linkId: string
  surveyId: string
  answers: Record<string, any>
}

export async function POST(request: NextRequest) {
  try {
    const body: SubmitBody = await request.json()
    const { linkId, surveyId, answers } = body

    const supabase = createAnonClient()

    // Step 1: Get tenant_id from surveys table
    const { data: survey, error: surveyError } = await supabase
      .from('surveys')
      .select('tenant_id')
      .eq('id', surveyId)
      .single()

    if (surveyError || !survey) {
      console.error('Failed to fetch survey tenant_id:', surveyError)
      return NextResponse.json(
        {
          success: false,
          error: 'Survey not found. Please try again.'
        },
        { status: 404 }
      )
    }

    // Type assertion for survey data
    const surveyData = survey as { tenant_id: string }

    // Step 2: Insert response into responses table
    const responseData: TablesInsert<'responses'> = {
      survey_link_id: linkId,
      answers: answers,
      tenant_id: surveyData.tenant_id,
      ai_qualification: null,
      status: 'new'
    }

    const { data: response, error: insertError } = await supabase
      .from('responses')
      .insert(responseData)
      .select('id')
      .single()

    if (insertError || !response) {
      console.error('Failed to insert response:', insertError)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to save your response. Please try again.'
        },
        { status: 400 }
      )
    }

    // Type assertion for response data
    const responseData_inserted = response as { id: string }

    // Step 3: Increment submission count using database function
    const { error: incrementError } = await supabase.rpc(
      'increment_submission_count',
      { link_id: linkId }
    )

    if (incrementError) {
      console.error('Failed to increment submission count:', incrementError)
    }

    return NextResponse.json({
      success: true,
      responseId: responseData_inserted.id,
      linkId: linkId  // Include linkId for calendar booking
    })
  } catch (error) {
    console.error('Unexpected error submitting survey:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred. Please try again.'
      },
      { status: 500 }
    )
  }
}
