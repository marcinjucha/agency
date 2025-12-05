-- Legal-Mind Initial Database Schema
-- Creates tables for multi-tenant SaaS platform for law firms

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- TABLES
-- ==========================================

-- Create tenants table (law firms)
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  domain TEXT UNIQUE,
  subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create users table (lawyers within tenants)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  google_calendar_token JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create surveys table
CREATE TABLE surveys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  questions JSONB NOT NULL DEFAULT '[]',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create survey_links table (unique tokens for clients)
CREATE TABLE survey_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  client_email TEXT,
  expires_at TIMESTAMPTZ,
  max_submissions INT DEFAULT 1,
  submission_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create responses table
CREATE TABLE responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  survey_link_id UUID NOT NULL REFERENCES survey_links(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  answers JSONB NOT NULL,
  ai_qualification JSONB,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'qualified', 'disqualified', 'contacted')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create appointments table
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  response_id UUID REFERENCES responses(id) ON DELETE SET NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lawyer_id UUID NOT NULL REFERENCES users(id),
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  google_calendar_event_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- INDEXES
-- ==========================================

CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_surveys_tenant ON surveys(tenant_id);
CREATE INDEX idx_surveys_status ON surveys(status);
CREATE INDEX idx_survey_links_token ON survey_links(token);
CREATE INDEX idx_responses_tenant ON responses(tenant_id);
CREATE INDEX idx_responses_status ON responses(status);
CREATE INDEX idx_responses_created ON responses(created_at DESC);
CREATE INDEX idx_appointments_tenant ON appointments(tenant_id);
CREATE INDEX idx_appointments_lawyer ON appointments(lawyer_id);
CREATE INDEX idx_appointments_start_time ON appointments(start_time);
CREATE INDEX idx_appointments_status ON appointments(status);

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tenants
CREATE POLICY "Users can view own tenant"
  ON tenants FOR SELECT
  USING (id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update own tenant"
  ON tenants FOR UPDATE
  USING (id = (SELECT tenant_id FROM users WHERE id = auth.uid()))
  WITH CHECK (id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- RLS Policies for users
CREATE POLICY "Users can view own tenant users"
  ON users FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- RLS Policies for surveys
CREATE POLICY "Users can view own tenant surveys"
  ON surveys FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can create surveys in own tenant"
  ON surveys FOR INSERT
  WITH CHECK (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update own tenant surveys"
  ON surveys FOR UPDATE
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can delete own tenant surveys"
  ON surveys FOR DELETE
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- RLS Policies for survey_links
CREATE POLICY "Users can manage own tenant survey links"
  ON survey_links FOR ALL
  USING (survey_id IN (
    SELECT id FROM surveys WHERE tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  ));

-- Public access to survey links (for client form)
CREATE POLICY "Anyone can view survey links by token"
  ON survey_links FOR SELECT
  USING (true);

-- RLS Policies for responses
CREATE POLICY "Users can view own tenant responses"
  ON responses FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update own tenant responses"
  ON responses FOR UPDATE
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- Public access to create responses (for client form submission)
CREATE POLICY "Anyone can create responses"
  ON responses FOR INSERT
  WITH CHECK (true);

-- RLS Policies for appointments
CREATE POLICY "Users can view own tenant appointments"
  ON appointments FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can manage own tenant appointments"
  ON appointments FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- Public access to create appointments (for client booking)
CREATE POLICY "Anyone can create appointments"
  ON appointments FOR INSERT
  WITH CHECK (true);

-- ==========================================
-- TRIGGERS
-- ==========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables
CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_surveys_updated_at
  BEFORE UPDATE ON surveys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_responses_updated_at
  BEFORE UPDATE ON responses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ==========================================
-- COMMENTS (Documentation)
-- ==========================================

COMMENT ON TABLE tenants IS 'Law firms using the platform';
COMMENT ON TABLE users IS 'Lawyers within law firms';
COMMENT ON TABLE surveys IS 'Survey templates created by law firms';
COMMENT ON TABLE survey_links IS 'Unique shareable links for surveys';
COMMENT ON TABLE responses IS 'Client submissions from survey forms';
COMMENT ON TABLE appointments IS 'Scheduled meetings between lawyers and clients';

COMMENT ON COLUMN surveys.questions IS 'JSONB array of question objects with type, label, required, options';
COMMENT ON COLUMN responses.answers IS 'JSONB object mapping question IDs to client answers';
COMMENT ON COLUMN responses.ai_qualification IS 'JSONB object with AI analysis results from n8n workflow';
COMMENT ON COLUMN users.google_calendar_token IS 'JSONB object with OAuth tokens for Google Calendar integration';
