-- Phase 141: PACS ↔ Parcels Bridge
-- Adds prop_id to parcels table and creates resolution functions.
-- Link: parcels.parcel_number = pacs_assessment_roll.geo_id → prop_id

-- ── 1. Add prop_id column to parcels ───────────────────────────────
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS prop_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_parcels_prop_id ON parcels (prop_id) WHERE prop_id IS NOT NULL;

-- ── 2. Backfill prop_id from pacs_assessment_roll ──────────────────
-- Uses geo_id (which matches parcel_number) to resolve prop_id.
-- Takes the most recent roll_year per geo_id for the latest mapping.
UPDATE parcels p
SET prop_id = sub.prop_id
FROM (
  SELECT DISTINCT ON (geo_id) geo_id, prop_id
  FROM pacs_assessment_roll
  WHERE geo_id IS NOT NULL
  ORDER BY geo_id, roll_year DESC
) sub
WHERE p.parcel_number = sub.geo_id
  AND p.prop_id IS NULL;

-- ── 3. RPC: resolve parcel UUID → prop_id ──────────────────────────
CREATE OR REPLACE FUNCTION resolve_parcel_prop_id(p_parcel_id UUID)
RETURNS TABLE(prop_id INTEGER, geo_id TEXT, parcel_number TEXT)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT p.prop_id, p.parcel_number AS geo_id, p.parcel_number
  FROM parcels p
  WHERE p.id = p_parcel_id;
$$;

-- ── 4. RPC: resolve parcel_number → prop_id (for search) ──────────
CREATE OR REPLACE FUNCTION resolve_parcel_number_to_prop_id(p_parcel_number TEXT)
RETURNS TABLE(parcel_id UUID, prop_id INTEGER)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT p.id AS parcel_id, p.prop_id
  FROM parcels p
  WHERE p.parcel_number = p_parcel_number;
$$;

-- ── 5. RPC: resolve prop_id → parcel UUID (reverse lookup) ────────
CREATE OR REPLACE FUNCTION resolve_prop_id_to_parcel(p_prop_id INTEGER)
RETURNS TABLE(parcel_id UUID, parcel_number TEXT)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT p.id AS parcel_id, p.parcel_number
  FROM parcels p
  WHERE p.prop_id = p_prop_id;
$$;
