-- Drop the single-column UNIQUE on parcel_number so multi-tenant
-- upserts work correctly.  The composite (county_id, parcel_number)
-- unique constraint already enforces uniqueness per county.
ALTER TABLE public.parcels DROP CONSTRAINT IF EXISTS parcels_parcel_number_key;
