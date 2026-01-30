-- Drop the restrictive SELECT policy and recreate as permissive
DROP POLICY IF EXISTS "Anyone can view parcels" ON public.parcels;

CREATE POLICY "Anyone can view parcels"
ON public.parcels
FOR SELECT
TO public
USING (true);

-- Also fix the same issue on sales table for the parcel detail sheet
DROP POLICY IF EXISTS "Anyone can view sales" ON public.sales;

CREATE POLICY "Anyone can view sales"
ON public.sales
FOR SELECT
TO public
USING (true);