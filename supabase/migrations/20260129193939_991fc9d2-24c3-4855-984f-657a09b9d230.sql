-- Drop existing restrictive SELECT policies and create permissive ones for public read access
-- This allows the dashboard to display data without authentication

-- Study periods: allow public read
DROP POLICY IF EXISTS "Authenticated users can view study periods" ON public.study_periods;
CREATE POLICY "Anyone can view study periods" 
  ON public.study_periods 
  FOR SELECT 
  USING (true);

-- VEI metrics: allow public read
DROP POLICY IF EXISTS "Authenticated users can view VEI metrics" ON public.vei_metrics;
CREATE POLICY "Anyone can view VEI metrics" 
  ON public.vei_metrics 
  FOR SELECT 
  USING (true);

-- Assessment ratios: allow public read
DROP POLICY IF EXISTS "Authenticated users can view assessment ratios" ON public.assessment_ratios;
CREATE POLICY "Anyone can view assessment ratios" 
  ON public.assessment_ratios 
  FOR SELECT 
  USING (true);

-- Appeals: allow public read
DROP POLICY IF EXISTS "Authenticated users can view appeals" ON public.appeals;
CREATE POLICY "Anyone can view appeals" 
  ON public.appeals 
  FOR SELECT 
  USING (true);

-- Parcels: allow public read
DROP POLICY IF EXISTS "Authenticated users can view parcels" ON public.parcels;
CREATE POLICY "Anyone can view parcels" 
  ON public.parcels 
  FOR SELECT 
  USING (true);

-- Sales: allow public read
DROP POLICY IF EXISTS "Authenticated users can view sales" ON public.sales;
CREATE POLICY "Anyone can view sales" 
  ON public.sales 
  FOR SELECT 
  USING (true);