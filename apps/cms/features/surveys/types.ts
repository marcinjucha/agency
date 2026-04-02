import type { Tables } from '@agency/database'

export type SurveyWithLinks = Tables<'surveys'> & {
  survey_links: Pick<Tables<'survey_links'>, 'id' | 'is_active' | 'expires_at' | 'max_submissions' | 'submission_count'>[]
}
