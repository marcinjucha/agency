-- Force PostgreSQL to clear cached query plans for RLS policies
-- This helps when policies are updated but cached plans still reference old policies

-- Temporarily disable RLS to clear cache
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE surveys DISABLE ROW LEVEL SECURITY;
ALTER TABLE survey_links DISABLE ROW LEVEL SECURITY;
ALTER TABLE responses DISABLE ROW LEVEL SECURITY;
ALTER TABLE appointments DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS (forces fresh policy evaluation)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Also force users table to use FORCE RLS for auth.uid() queries
ALTER TABLE users FORCE ROW LEVEL SECURITY;
