
-- ============================================================
-- Sync Watermarks — track incremental sync state per product
-- ============================================================
CREATE TABLE public.sync_watermarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  county_id UUID NOT NULL REFERENCES public.counties(id),
  product_id TEXT NOT NULL,
  last_success_at TIMESTAMPTZ,
  last_seen_change_id TEXT,
  last_modified_at TIMESTAMPTZ,
  last_row_count INTEGER NOT NULL DEFAULT 0,
  last_strategy TEXT NOT NULL DEFAULT 'full_refresh',
  status TEXT NOT NULL DEFAULT 'never_run',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (county_id, product_id)
);

ALTER TABLE public.sync_watermarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view watermarks for their county"
  ON public.sync_watermarks FOR SELECT
  USING (county_id = get_user_county_id());

CREATE POLICY "Users can insert watermarks for their county"
  ON public.sync_watermarks FOR INSERT
  WITH CHECK (county_id = get_user_county_id());

CREATE POLICY "Users can update watermarks for their county"
  ON public.sync_watermarks FOR UPDATE
  USING (county_id = get_user_county_id());

CREATE POLICY "Admins can delete watermarks"
  ON public.sync_watermarks FOR DELETE
  USING (is_admin());

-- ============================================================
-- Schema Registry — track expected PACS source schemas
-- ============================================================
CREATE TABLE public.pacs_schema_registry (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  county_id UUID NOT NULL REFERENCES public.counties(id),
  source_table TEXT NOT NULL,
  expected_columns JSONB NOT NULL DEFAULT '[]'::jsonb,
  actual_columns JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  missing_required TEXT[] DEFAULT '{}',
  missing_optional TEXT[] DEFAULT '{}',
  last_validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (county_id, source_table)
);

ALTER TABLE public.pacs_schema_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view schema registry for their county"
  ON public.pacs_schema_registry FOR SELECT
  USING (county_id = get_user_county_id());

CREATE POLICY "Users can insert schema registry for their county"
  ON public.pacs_schema_registry FOR INSERT
  WITH CHECK (county_id = get_user_county_id());

CREATE POLICY "Users can update schema registry for their county"
  ON public.pacs_schema_registry FOR UPDATE
  USING (county_id = get_user_county_id());

CREATE POLICY "Admins can delete schema registry"
  ON public.pacs_schema_registry FOR DELETE
  USING (is_admin());

-- ============================================================
-- Performance indexes on TerraFusion Postgres side
-- ============================================================

-- parcel_neighborhood_year: core analytics join
CREATE INDEX IF NOT EXISTS idx_pny_county_year_hood
  ON public.parcel_neighborhood_year (county_id, year, hood_cd);

CREATE INDEX IF NOT EXISTS idx_pny_county_year_parcel
  ON public.parcel_neighborhood_year (county_id, year, parcel_id);

-- neighborhoods dimension
CREATE INDEX IF NOT EXISTS idx_neighborhoods_county_year_hood
  ON public.neighborhoods (county_id, year, hood_cd);

-- parcels: source_parcel_id for UUID resolver
CREATE INDEX IF NOT EXISTS idx_parcels_source_parcel_id
  ON public.parcels (source_parcel_id) WHERE source_parcel_id IS NOT NULL;

-- parcels: neighborhood analytics
CREATE INDEX IF NOT EXISTS idx_parcels_county_neighborhood
  ON public.parcels (county_id, neighborhood_code);

-- appeals: workflow by parcel + status
CREATE INDEX IF NOT EXISTS idx_appeals_parcel_status
  ON public.appeals (parcel_id, status);

-- permits: workflow by parcel + status
CREATE INDEX IF NOT EXISTS idx_permits_parcel_status
  ON public.permits (parcel_id, status);

-- exemptions: workflow by parcel + status
CREATE INDEX IF NOT EXISTS idx_exemptions_parcel_status
  ON public.exemptions (parcel_id, status);

-- sync_watermarks: product lookup
CREATE INDEX IF NOT EXISTS idx_sync_watermarks_county_product
  ON public.sync_watermarks (county_id, product_id);
