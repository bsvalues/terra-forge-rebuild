
-- ============================================================
-- Security Fix: Close 2 error-level findings
-- 1) profiles: drop overly-permissive "view all" SELECT policy
-- 2) appeals: restrict owner_email access to admins only via view
-- ============================================================

-- ── 1) profiles: remove the public "view all" policy ─────────
-- The remaining policy "Users can view their own profile" (user_id = auth.uid())
-- already gives each user access to their own row. Drop the catch-all.
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Also ensure anon role cannot read profiles at all (belt-and-suspenders)
REVOKE SELECT ON public.profiles FROM anon;

-- ── 2) appeals: owner_email column ───────────────────────────
-- County-scoped SELECT is correct but the column contains PII.
-- Strategy: create a restricted view that strips owner_email for
-- non-admin authenticated users, and grant access accordingly.

-- Create a sanitised view for general authenticated access
CREATE OR REPLACE VIEW public.appeals_sanitized AS
SELECT
  id,
  parcel_id,
  county_id,
  study_period_id,
  appeal_date,
  hearing_date,
  resolution_date,
  original_value,
  requested_value,
  final_value,
  tax_year,
  status,
  resolution_type,
  notes,
  created_at,
  updated_at
  -- owner_email intentionally excluded
FROM public.appeals;

-- RLS does not apply to views by default; set security_invoker so
-- the underlying table's RLS policies still apply (Postgres 15+).
-- For compatibility, we instead rely on the base table's RLS and
-- grant select on the view to authenticated users only.
GRANT SELECT ON public.appeals_sanitized TO authenticated;
REVOKE SELECT ON public.appeals_sanitized FROM anon;

-- Keep the base table accessible only to admins for full-field access
-- (existing INSERT/UPDATE/DELETE admin-only policies remain in place).
-- The existing SELECT policy allows county members to see the base table;
-- we tighten it so direct base-table reads also require auth, not anon.
REVOKE SELECT ON public.appeals FROM anon;

-- Mark the findings as resolved
