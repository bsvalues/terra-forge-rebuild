-- Add unique constraint for county_id + parcel_number to enable upserts
ALTER TABLE public.parcels ADD CONSTRAINT parcels_county_id_parcel_number_key UNIQUE (county_id, parcel_number);