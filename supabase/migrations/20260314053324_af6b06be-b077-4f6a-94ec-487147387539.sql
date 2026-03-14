
-- Fix search_path on new function
ALTER FUNCTION public.prevent_certified_assessment_update() SET search_path = public;
