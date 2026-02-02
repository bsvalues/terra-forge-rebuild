-- Fix overly permissive RLS policies by using RESTRICTIVE policies for write operations

-- Drop the ALL policies and create specific ones
DROP POLICY IF EXISTS "Admins can manage data sources" ON public.data_sources;
DROP POLICY IF EXISTS "Admins can manage assessments" ON public.assessments;
DROP POLICY IF EXISTS "Admins can manage external valuations" ON public.external_valuations;

-- Create specific INSERT/UPDATE/DELETE policies for data_sources
CREATE POLICY "Admins can insert data sources" ON public.data_sources 
  FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can update data sources" ON public.data_sources 
  FOR UPDATE USING (is_admin());
CREATE POLICY "Admins can delete data sources" ON public.data_sources 
  FOR DELETE USING (is_admin());

-- Create specific INSERT/UPDATE/DELETE policies for assessments
CREATE POLICY "Admins can insert assessments" ON public.assessments 
  FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can update assessments" ON public.assessments 
  FOR UPDATE USING (is_admin());
CREATE POLICY "Admins can delete assessments" ON public.assessments 
  FOR DELETE USING (is_admin());

-- Create specific INSERT/UPDATE/DELETE policies for external_valuations
CREATE POLICY "Admins can insert external valuations" ON public.external_valuations 
  FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can update external valuations" ON public.external_valuations 
  FOR UPDATE USING (is_admin());
CREATE POLICY "Admins can delete external valuations" ON public.external_valuations 
  FOR DELETE USING (is_admin());