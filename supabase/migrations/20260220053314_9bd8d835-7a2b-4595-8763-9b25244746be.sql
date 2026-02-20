
-- Fix: Set security_invoker on appeals_sanitized view so it runs with
-- the querying user's permissions (respecting underlying RLS), not
-- the view definer's permissions.
ALTER VIEW public.appeals_sanitized SET (security_invoker = true);
