// =============================================================
// Get Response Handler — fetch full survey response data
// =============================================================
// Reads variableContext.responseId, fetches response + survey_link
// + survey + tenant from Supabase, builds Q&A pairs and qaContext.
// Returns all 10 fields of the get_response output schema.
// tenant_id filter on responses fetch for security.
// =============================================================

const https = require('https');

const SUPABASE_URL = $env.SUPABASE_URL;
if (!SUPABASE_URL) throw new Error('SUPABASE_URL not configured');
const SUPABASE_KEY = $env.SUPABASE_SERVICE_ROLE_KEY;

async function supabaseRequest(path) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  return new Promise((resolve, reject) => {
    const match = url.match(/^https?:\/\/([^/]+)(\/.*)$/);
    if (!match) { reject(new Error('Invalid SUPABASE_URL')); return; }
    const options = {
      hostname: match[1], path: match[2], method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) reject(new Error(`Supabase ${path}: ${res.statusCode} ${data}`));
          else resolve(parsed);
        } catch (e) { reject(new Error(`Parse error for ${path}: ${data}`)); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

try {
  const item = $input.first().json;
  const { variableContext, tenantId } = item;

  // Resolve responseId: use resolvedConfig.responseIdExpression (pre-resolved by Orchestrator)
  // or fall back to variableContext.responseId for backward compat
  const responseId = item.resolvedConfig?.responseIdExpression ?? variableContext.responseId;
  if (!responseId) throw new Error('get_response: responseIdExpression did not resolve to a valid ID');

  const safeTenantId = tenantId ?? '00000000-0000-0000-0000-000000000000';

  // Phase 1: fetch response row with tenant_id filter (security)
  const responses = await supabaseRequest(
    `responses?id=eq.${responseId}&tenant_id=eq.${encodeURIComponent(safeTenantId)}&limit=1`
  );
  if (!responses.length) throw new Error(`Response ${responseId} not found for tenant ${safeTenantId}`);
  const response = responses[0];

  // Parse answers JSONB: { questionId: answerValue, ... }
  let answersMap = {};
  if (typeof response.answers === 'string') {
    try { answersMap = JSON.parse(response.answers); } catch {}
  } else if (response.answers && typeof response.answers === 'object') {
    answersMap = response.answers;
  }

  // Phase 2: fetch survey link
  const surveyLinks = await supabaseRequest(
    `survey_links?id=eq.${response.survey_link_id}&limit=1`
  );
  const surveyLink = surveyLinks.length ? surveyLinks[0] : {};

  // Phase 3: fetch survey (questions JSONB)
  const surveyId = surveyLink.survey_id || null;
  let survey = { title: 'Unknown Survey', questions: [] };
  if (surveyId) {
    const surveys = await supabaseRequest(`surveys?id=eq.${surveyId}&limit=1`);
    if (surveys.length) survey = surveys[0];
  }

  // Phase 4: fetch tenant name for companyName variable
  const tenants = await supabaseRequest(
    `tenants?id=eq.${encodeURIComponent(safeTenantId)}&select=name&limit=1`
  );
  const companyName = tenants.length > 0 ? (tenants[0].name ?? '') : '';

  // Parse questions from surveys.questions JSONB
  let questions = [];
  if (typeof survey.questions === 'string') {
    try { questions = JSON.parse(survey.questions); } catch {}
  } else if (Array.isArray(survey.questions)) {
    questions = survey.questions;
  }

  // Build Q&A pairs from answers map + questions
  const qaPairs = Object.entries(answersMap).map(([questionId, answer]) => {
    const q = questions.find(q => q.id === questionId);
    return {
      questionText: q ? q.question : questionId,
      answer: String(answer),
      questionType: q ? q.type : 'text',
    };
  });

  const qaContext = qaPairs
    .map(qa => `Q: ${qa.questionText}\nA: ${qa.answer}`)
    .join('\n\n');

  // Extract email + name from form answers (preferred over survey_link defaults).
  // Falls back to survey_link.notification_email / client_email when answer not present.
  const answerEmail = qaPairs.find(qa => qa.questionType === 'email' && qa.answer)?.answer || null;

  return {
    json: {
      ...item,
      stepResult: {
        success: true,
        outputPayload: {
          responseId: response.id,
          status: response.status || null,
          respondentName: response.respondent_name || null,
          createdAt: response.created_at,
          surveyTitle: survey.title,
          clientEmail: answerEmail || surveyLink.notification_email || surveyLink.client_email || null,
          answers: qaPairs,
          qaContext,
          companyName,
          aiQualification: response.ai_qualification || null,
          responseUrl: `${$env.HOST_URL || ''}/admin/responses/${response.id}`,
        },
      },
    }
  };
} catch (err) {
  const item = $input.first().json;
  return { json: { ...item, stepResult: { success: false, error: err.message } } };
}
