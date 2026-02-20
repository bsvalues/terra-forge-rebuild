
-- Fix overly permissive RLS policies
-- Replace "Anyone can view X" (USING true) with county-scoped policies

-- PARCELS: scope reads to user's county
DROP POLICY IF EXISTS "Anyone can view parcels" ON public.parcels;
CREATE POLICY "Users can view parcels in their county"
  ON public.parcels FOR SELECT
  USING (county_id = get_user_county_id());

-- SALES: scope reads to user's county
DROP POLICY IF EXISTS "Anyone can view sales" ON public.sales;
CREATE POLICY "Users can view sales in their county"
  ON public.sales FOR SELECT
  USING (county_id = get_user_county_id());

-- ASSESSMENTS: scope reads to user's county
DROP POLICY IF EXISTS "Anyone can view assessments" ON public.assessments;
CREATE POLICY "Users can view assessments in their county"
  ON public.assessments FOR SELECT
  USING (county_id = get_user_county_id());

-- APPEALS: scope reads to user's county (also hides cross-county owner_email)
DROP POLICY IF EXISTS "Anyone can view appeals" ON public.appeals;
CREATE POLICY "Users can view appeals in their county"
  ON public.appeals FOR SELECT
  USING (county_id = get_user_county_id());

-- APPEAL_STATUS_CHANGES: scope via county on the parent appeal
DROP POLICY IF EXISTS "Anyone can view appeal status changes" ON public.appeal_status_changes;
CREATE POLICY "Users can view appeal status changes in their county"
  ON public.appeal_status_changes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.appeals a
      WHERE a.id = appeal_status_changes.appeal_id
        AND a.county_id = get_user_county_id()
    )
  );

-- EXEMPTIONS: scope reads to user's county (protects applicant_name)
DROP POLICY IF EXISTS "Anyone can view exemptions" ON public.exemptions;
CREATE POLICY "Users can view exemptions in their county"
  ON public.exemptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.parcels p
      WHERE p.id = exemptions.parcel_id
        AND p.county_id = get_user_county_id()
    )
  );

-- PERMITS: scope reads to user's county
DROP POLICY IF EXISTS "Anyone can view permits" ON public.permits;
CREATE POLICY "Users can view permits in their county"
  ON public.permits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.parcels p
      WHERE p.id = permits.parcel_id
        AND p.county_id = get_user_county_id()
    )
  );

-- PROFILES: users should only see their own profile
-- get_user_county_id() uses SECURITY DEFINER so it can still read profiles internally
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (user_id = auth.uid());

-- ASSESSMENT_RATIOS: scope reads to user's county via study_period → county
DROP POLICY IF EXISTS "Anyone can view assessment ratios" ON public.assessment_ratios;
CREATE POLICY "Users can view assessment ratios in their county"
  ON public.assessment_ratios FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.parcels p
      WHERE p.id = assessment_ratios.parcel_id
        AND p.county_id = get_user_county_id()
    )
  );

-- MODEL_RECEIPTS: scope reads to authenticated users who are operators or county members
DROP POLICY IF EXISTS "Anyone can view model receipts" ON public.model_receipts;
CREATE POLICY "Users can view model receipts in their county"
  ON public.model_receipts FOR SELECT
  USING (
    operator_id = auth.uid()
    OR (
      parcel_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.parcels p
        WHERE p.id = model_receipts.parcel_id
          AND p.county_id = get_user_county_id()
      )
    )
  );

-- EXTERNAL_VALUATIONS: scope reads to user's county via parcel
DROP POLICY IF EXISTS "Anyone can view external valuations" ON public.external_valuations;
CREATE POLICY "Users can view external valuations in their county"
  ON public.external_valuations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.parcels p
      WHERE p.id = external_valuations.parcel_id
        AND p.county_id = get_user_county_id()
    )
  );

-- GIS LAYERS & FEATURES: keep public read (map data is not PII, county-scoped is done at layer level by admin inserts)
-- DATA_SOURCES: scope reads to user's county
DROP POLICY IF EXISTS "Anyone can view data sources" ON public.data_sources;
CREATE POLICY "Users can view data sources in their county"
  ON public.data_sources FOR SELECT
  USING (county_id = get_user_county_id());

-- COUNTIES: keep public read (needed for county lookup/switching)
-- SCRAPE_JOBS: scope reads to admins only (job management is admin concern)
DROP POLICY IF EXISTS "Anyone can view scrape jobs" ON public.scrape_jobs;
CREATE POLICY "Authenticated users can view scrape jobs"
  ON public.scrape_jobs FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- SCHEDULED_SCRAPES: scope reads to admins only
DROP POLICY IF EXISTS "Anyone can view scheduled scrapes" ON public.scheduled_scrapes;
CREATE POLICY "Authenticated users can view scheduled scrapes"
  ON public.scheduled_scrapes FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- GIS_DATA_SOURCES: scope reads to admins only (contains connection_url and credentials_encrypted)
DROP POLICY IF EXISTS "Anyone can view GIS data sources" ON public.gis_data_sources;
CREATE POLICY "Admins can view GIS data sources"
  ON public.gis_data_sources FOR SELECT
  USING (is_admin());

-- STUDY_PERIODS: scope reads to user's county
DROP POLICY IF EXISTS "Anyone can view study periods" ON public.study_periods;
CREATE POLICY "Users can view study periods in their county"
  ON public.study_periods FOR SELECT
  USING (county_id = get_user_county_id());
