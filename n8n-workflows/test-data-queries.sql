-- N8n Survey Analysis - Test Data Queries
-- Use these queries to get real UUIDs for testing

-- ============================================
-- STEP 1: Get Survey Information
-- ============================================

-- Get a survey with its basic info
SELECT
  id as survey_id,
  tenant_id,
  title,
  jsonb_array_length(questions) as question_count
FROM surveys
WHERE deleted_at IS NULL
LIMIT 1;

-- Example output:
-- survey_id: 123e4567-e89b-12d3-a456-426614174000
-- tenant_id: 987fcdeb-51a2-43d7-8f9a-123456789abc
-- title: "Formularz Wstępnej Konsultacji"
-- question_count: 5

-- ============================================
-- STEP 2: Get Question IDs from Survey
-- ============================================

-- Extract question IDs and details from JSONB
SELECT
  x.id as question_id,
  x.question as question_text,
  x.type as question_type,
  x."order" as question_order,
  x.required as is_required
FROM jsonb_to_recordset(
  (SELECT questions FROM surveys WHERE id = '123e4567-e89b-12d3-a456-426614174000')
) AS x(id text, question text, type text, "order" int, required boolean)
ORDER BY x."order";

-- Example output:
-- question_id: q-name-uuid | question_text: "Imię i nazwisko" | type: text
-- question_id: q-email-uuid | question_text: "Email" | type: email
-- question_id: q-case-uuid | question_text: "Opisz sprawę" | type: textarea

-- ============================================
-- STEP 3: Get Response ID
-- ============================================

-- Option A: Get any response for the survey
SELECT
  id as response_id,
  survey_id,
  created_at,
  status,
  jsonb_object_keys(answers) as answer_count
FROM responses
WHERE survey_id = '123e4567-e89b-12d3-a456-426614174000'
  AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 1;

-- Option B: Get response WITHOUT AI analysis (for testing)
SELECT
  id as response_id,
  survey_id,
  created_at,
  status
FROM responses
WHERE survey_id = '123e4567-e89b-12d3-a456-426614174000'
  AND ai_qualification IS NULL
  AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 1;

-- ============================================
-- STEP 4: View Existing Answers (for reference)
-- ============================================

-- See what answers look like in the response
SELECT
  id,
  jsonb_pretty(answers) as formatted_answers
FROM responses
WHERE id = '[RESPONSE_UUID]';

-- Example output:
-- {
--   "q-name-uuid": "Jan Kowalski",
--   "q-email-uuid": "jan@example.com",
--   "q-case-uuid": "Sprawa rozwodowa"
-- }

-- ============================================
-- STEP 5: Get Complete Test Payload
-- ============================================

-- Generate a complete test payload in one query
WITH survey_data AS (
  SELECT
    id as survey_id,
    tenant_id,
    questions
  FROM surveys
  WHERE deleted_at IS NULL
  LIMIT 1
),
response_data AS (
  SELECT
    id as response_id,
    survey_id,
    answers
  FROM responses
  WHERE survey_id = (SELECT survey_id FROM survey_data)
    AND ai_qualification IS NULL
    AND deleted_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1
)
SELECT
  jsonb_build_object(
    'responseId', r.response_id,
    'surveyId', s.survey_id,
    'tenant_id', s.tenant_id,
    'answers', r.answers
  ) as test_payload
FROM survey_data s
CROSS JOIN response_data r;

-- Example output (copy this for curl):
-- {
--   "responseId": "resp-uuid",
--   "surveyId": "survey-uuid",
--   "tenant_id": "tenant-uuid",
--   "answers": { ... }
-- }

-- ============================================
-- VERIFICATION QUERIES (After Testing)
-- ============================================

-- Check if AI analysis was saved
SELECT
  id,
  status,
  ai_qualification IS NOT NULL as has_ai_analysis,
  ai_qualification->>'recommendation' as recommendation,
  (ai_qualification->>'overall_score')::numeric as overall_score,
  ai_qualification->>'analyzed_at' as analyzed_at
FROM responses
WHERE id = '[RESPONSE_UUID]';

-- View full AI analysis (pretty-printed)
SELECT
  id,
  jsonb_pretty(ai_qualification) as ai_analysis
FROM responses
WHERE id = '[RESPONSE_UUID]';

-- Expected output:
-- {
--   "urgency_score": 7,
--   "complexity_score": 6,
--   "value_score": 8,
--   "success_probability": 7,
--   "overall_score": 7.2,
--   "summary": "Sprawa rozwodowa z konfliktem majątkowym",
--   "recommendation": "QUALIFIED",
--   "notes_for_lawyer": [
--     "Sprawdzić dokumentację majątkową",
--     "Czy była intercyza?",
--     "Przygotować listę majątku wspólnego"
--   ],
--   "analyzed_at": "2026-02-04T10:30:00Z",
--   "model": "claude-haiku-4-5",
--   "version": "1.0"
-- }

-- ============================================
-- STATISTICS QUERIES
-- ============================================

-- Overall AI analysis coverage
SELECT
  COUNT(*) as total_responses,
  COUNT(*) FILTER (WHERE ai_qualification IS NOT NULL) as analyzed_responses,
  ROUND(100.0 * COUNT(*) FILTER (WHERE ai_qualification IS NOT NULL) / NULLIF(COUNT(*), 0), 1) as coverage_percentage
FROM responses
WHERE deleted_at IS NULL;

-- Recommendation breakdown
SELECT
  ai_qualification->>'recommendation' as recommendation,
  COUNT(*) as count,
  ROUND(AVG((ai_qualification->>'overall_score')::numeric), 2) as avg_overall_score,
  ROUND(AVG((ai_qualification->>'urgency_score')::numeric), 2) as avg_urgency,
  ROUND(AVG((ai_qualification->>'value_score')::numeric), 2) as avg_value
FROM responses
WHERE ai_qualification IS NOT NULL
GROUP BY ai_qualification->>'recommendation'
ORDER BY count DESC;

-- Recent analyses (last 10)
SELECT
  r.id,
  r.created_at,
  s.title as survey_title,
  r.status,
  r.ai_qualification->>'recommendation' as recommendation,
  (r.ai_qualification->>'overall_score')::numeric as score,
  r.ai_qualification->>'summary' as summary
FROM responses r
JOIN surveys s ON s.id = r.survey_id
WHERE r.ai_qualification IS NOT NULL
ORDER BY r.created_at DESC
LIMIT 10;

-- Highest scoring responses (potential hot leads)
SELECT
  r.id,
  s.title as survey_title,
  (r.ai_qualification->>'overall_score')::numeric as overall_score,
  (r.ai_qualification->>'urgency_score')::numeric as urgency,
  (r.ai_qualification->>'value_score')::numeric as value,
  r.ai_qualification->>'summary' as summary,
  r.created_at
FROM responses r
JOIN surveys s ON s.id = r.survey_id
WHERE r.ai_qualification IS NOT NULL
  AND r.ai_qualification->>'recommendation' = 'QUALIFIED'
ORDER BY (r.ai_qualification->>'overall_score')::numeric DESC
LIMIT 10;

-- Responses that need more info
SELECT
  r.id,
  s.title as survey_title,
  r.ai_qualification->>'summary' as summary,
  r.created_at
FROM responses r
JOIN surveys s ON s.id = r.survey_id
WHERE r.ai_qualification IS NOT NULL
  AND r.ai_qualification->>'recommendation' = 'NEEDS_MORE_INFO'
ORDER BY r.created_at DESC;

-- Error cases (AI parsing failed)
SELECT
  r.id,
  s.title as survey_title,
  r.ai_qualification->'error' as error_message,
  substring(r.ai_qualification->>'raw_response', 1, 200) as response_preview,
  r.created_at
FROM responses r
JOIN surveys s ON s.id = r.survey_id
WHERE r.ai_qualification ? 'error'
ORDER BY r.created_at DESC;

-- ============================================
-- CLEANUP QUERIES (Use with Caution)
-- ============================================

-- Remove AI analysis from specific response (for re-testing)
UPDATE responses
SET
  ai_qualification = NULL,
  status = 'new',
  updated_at = NOW()
WHERE id = '[RESPONSE_UUID]';

-- Remove AI analysis from all responses of a survey (for batch re-testing)
UPDATE responses
SET
  ai_qualification = NULL,
  status = 'new',
  updated_at = NOW()
WHERE survey_id = '[SURVEY_UUID]'
  AND ai_qualification IS NOT NULL;

-- ============================================
-- PERFORMANCE QUERIES
-- ============================================

-- Check JSONB field size (storage usage)
SELECT
  pg_size_pretty(pg_column_size(ai_qualification)) as ai_qualification_size,
  id
FROM responses
WHERE ai_qualification IS NOT NULL
ORDER BY pg_column_size(ai_qualification) DESC
LIMIT 10;

-- Average processing time (requires created_at and analyzed_at comparison)
SELECT
  AVG(
    EXTRACT(EPOCH FROM (ai_qualification->>'analyzed_at')::timestamptz - created_at)
  ) as avg_processing_seconds,
  MIN(
    EXTRACT(EPOCH FROM (ai_qualification->>'analyzed_at')::timestamptz - created_at)
  ) as min_processing_seconds,
  MAX(
    EXTRACT(EPOCH FROM (ai_qualification->>'analyzed_at')::timestamptz - created_at)
  ) as max_processing_seconds
FROM responses
WHERE ai_qualification IS NOT NULL
  AND ai_qualification ? 'analyzed_at'
  AND created_at < (ai_qualification->>'analyzed_at')::timestamptz;

-- ============================================
-- INDEX RECOMMENDATIONS (Optional)
-- ============================================

-- Create GIN index on ai_qualification for faster JSONB queries
-- CREATE INDEX idx_responses_ai_qualification
-- ON responses USING GIN (ai_qualification);

-- Create index on recommendation field (for filtering)
-- CREATE INDEX idx_responses_recommendation
-- ON responses ((ai_qualification->>'recommendation'));

-- Create index on overall_score (for sorting by score)
-- CREATE INDEX idx_responses_overall_score
-- ON responses (((ai_qualification->>'overall_score')::numeric));

-- ============================================
-- NOTES
-- ============================================

-- 1. Replace [RESPONSE_UUID], [SURVEY_UUID], [TENANT_UUID] with actual UUIDs
-- 2. Use STEP 1-4 queries to get test data
-- 3. Use VERIFICATION queries after running n8n workflow
-- 4. Use STATISTICS queries to monitor AI performance
-- 5. Use CLEANUP queries carefully (removes AI analysis)

-- ============================================
-- QUICK TEST WORKFLOW
-- ============================================

-- 1. Run STEP 1 to get survey_id and tenant_id
-- 2. Run STEP 2 with your survey_id to get question UUIDs
-- 3. Run STEP 3 to get a response_id without AI analysis
-- 4. Build curl command with these UUIDs
-- 5. Run curl to trigger n8n workflow
-- 6. Run VERIFICATION query to check results
-- 7. Run STATISTICS queries to see overall performance
