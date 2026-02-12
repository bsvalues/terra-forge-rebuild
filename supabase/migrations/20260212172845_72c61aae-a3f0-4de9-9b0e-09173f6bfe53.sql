
-- Drop restrictive admin-only INSERT/UPDATE policies on parcels
DROP POLICY IF EXISTS "Admins can insert parcels" ON public.parcels;
DROP POLICY IF EXISTS "Admins can update parcels" ON public.parcels;

-- Allow authenticated users to insert parcels for their county
CREATE POLICY "Users can insert parcels for their county"
ON public.parcels FOR INSERT TO authenticated
WITH CHECK (county_id = get_user_county_id());

-- Allow authenticated users to update parcels for their county
CREATE POLICY "Users can update parcels for their county"
ON public.parcels FOR UPDATE TO authenticated
USING (county_id = get_user_county_id());

-- Also fix sales table for the upcoming sales import
DROP POLICY IF EXISTS "Admins can insert sales" ON public.sales;
DROP POLICY IF EXISTS "Admins can update sales" ON public.sales;

CREATE POLICY "Users can insert sales for their county"
ON public.sales FOR INSERT TO authenticated
WITH CHECK (county_id = get_user_county_id());

CREATE POLICY "Users can update sales for their county"
ON public.sales FOR UPDATE TO authenticated
USING (county_id = get_user_county_id());
