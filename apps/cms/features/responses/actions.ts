'use server'

export async function triggerAiAnalysis(responseId: string): Promise<{ success: boolean; error?: string }> {
  const webhookUrl = process.env.N8N_WEBHOOK_SURVEY_ANALYSIS_URL
  if (!webhookUrl) {
    return { success: false, error: 'N8N_WEBHOOK_SURVEY_ANALYSIS_URL not configured' }
  }
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ responseId }),
    })
    if (!res.ok) return { success: false, error: `Webhook returned ${res.status}` }
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
