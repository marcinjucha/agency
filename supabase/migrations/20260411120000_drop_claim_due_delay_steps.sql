-- Drop claim_due_delay_steps RPC — delay handling moved to native n8n Wait node (AAA-T-183)
-- The function is no longer called by the Workflow Delay Processor (archived).
DROP FUNCTION IF EXISTS public.claim_due_delay_steps(INT);
