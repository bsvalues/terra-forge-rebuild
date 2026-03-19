-- Duplicate detection RPCs for Data Doctor
-- These use deterministic SQL, not AI — the instruments, not the doctor.

CREATE OR REPLACE FUNCTION public.count_duplicate_parcel_numbers(p_county_id UUID)
RETURNS TABLE(count BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(dup_count), 0)::BIGINT AS count
  FROM (
    SELECT COUNT(*) AS dup_count
    FROM parcels
    WHERE county_id = p_county_id
    GROUP BY parcel_number
    HAVING COUNT(*) > 1
  ) sub;
$$;

CREATE OR REPLACE FUNCTION public.count_duplicate_addresses(p_county_id UUID)
RETURNS TABLE(count BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(dup_count), 0)::BIGINT AS count
  FROM (
    SELECT COUNT(*) AS dup_count
    FROM parcels
    WHERE county_id = p_county_id
      AND address IS NOT NULL
      AND address != ''
    GROUP BY LOWER(TRIM(address))
    HAVING COUNT(*) > 1
  ) sub;
$$;