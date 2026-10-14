-- Remove repeated copies of the same recorded sale, keeping the oldest copy.
DELETE FROM public.sales s
USING (
  SELECT id, row_number() OVER (PARTITION BY county_id, parcel_id, instrument_number ORDER BY created_at, id) rn
  FROM public.sales WHERE instrument_number IS NOT NULL
) d
WHERE s.id = d.id AND d.rn > 1;

-- One recorded instrument per parcel per county. Sales without a recording number are unaffected (NULLs are distinct).
ALTER TABLE public.sales
  ADD CONSTRAINT sales_county_parcel_instrument_key UNIQUE (county_id, parcel_id, instrument_number);