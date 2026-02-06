-- AI Agency: Create First User for CMS Login
-- Run this in Supabase SQL Editor: https://app.supabase.com/project/zsrpdslhnuwmzewwoexr/sql

-- ==========================================
-- STEP 1: Create Tenant (Law Firm)
-- ==========================================

INSERT INTO tenants (name, email, subscription_status)
VALUES ('Test Law Firm', 'admin@testfirm.com', 'trial')
RETURNING id;

-- ⚠️ COPY THE ID FROM ABOVE (looks like: 123e4567-e89b-12d3-a456-426614174000)
-- You'll need it in Step 3

-- ==========================================
-- STEP 2: Create Auth User
-- ==========================================

-- ⚠️ DO THIS IN SUPABASE DASHBOARD (not SQL):
-- 1. Go to: https://app.supabase.com/project/zsrpdslhnuwmzewwoexr/auth/users
-- 2. Click "Add User" → "Create new user"
-- 3. Email: admin@testfirm.com
-- 4. Password: YourSecurePassword123
-- 5. Auto Confirm User: ✅ CHECK THIS!
-- 6. Click "Create user"
-- 7. COPY THE USER ID (looks like: abc12345-...)

-- ==========================================
-- STEP 3: Link Auth User to Tenant
-- ==========================================

-- ⚠️ REPLACE THESE VALUES:
-- - '<AUTH_USER_ID>' with ID from Step 2
-- - '<TENANT_ID>' with ID from Step 1

INSERT INTO users (id, tenant_id, email, full_name, role)
VALUES (
  '<AUTH_USER_ID>',     -- Replace with auth user ID from Step 2
  '<TENANT_ID>',        -- Replace with tenant ID from Step 1
  'admin@testfirm.com',
  'Admin User',
  'owner'
);

-- ==========================================
-- VERIFICATION
-- ==========================================

-- Check if user was created correctly:
SELECT
  u.id,
  u.email,
  u.full_name,
  u.role,
  t.name as tenant_name
FROM users u
JOIN tenants t ON u.tenant_id = t.id
WHERE u.email = 'admin@testfirm.com';

-- Should return 1 row with your user details

-- ==========================================
-- NOW YOU CAN LOGIN!
-- ==========================================

-- Go to: https://legal-mind-cms.vercel.app/login
-- Email: admin@testfirm.com
-- Password: YourSecurePassword123

-- ==========================================
-- TROUBLESHOOTING
-- ==========================================

-- If login fails with "User not found in database":
-- Check if user exists in users table:
SELECT * FROM users WHERE id = '<AUTH_USER_ID>';

-- If it returns nothing, re-run Step 3 with correct IDs

-- If login fails with "Invalid login credentials":
-- Check auth user exists:
-- Go to: https://app.supabase.com/project/zsrpdslhnuwmzewwoexr/auth/users
-- Verify email and that user is confirmed
