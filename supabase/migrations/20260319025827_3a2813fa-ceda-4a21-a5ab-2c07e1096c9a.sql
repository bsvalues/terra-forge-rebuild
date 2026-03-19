
-- Fix: security definer views by explicitly setting SECURITY INVOKER
ALTER VIEW public.mart_slco_workbench_summary SET (security_invoker = on);
ALTER VIEW public.mart_slco_forge_cost_context SET (security_invoker = on);
ALTER VIEW public.mart_slco_dossier_index SET (security_invoker = on);
