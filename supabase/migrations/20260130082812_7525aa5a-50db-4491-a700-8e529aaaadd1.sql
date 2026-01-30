-- Add a temporary policy to allow all operations on scheduled_scrapes for testing
-- This enables the admin dashboard to work without authentication in development

-- First drop the restrictive admin-only policy
DROP POLICY IF EXISTS "Admins can manage scheduled scrapes" ON public.scheduled_scrapes;

-- Create a more permissive policy for all operations
CREATE POLICY "Allow all operations on scheduled scrapes"
ON public.scheduled_scrapes
FOR ALL
USING (true)
WITH CHECK (true);