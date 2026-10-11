-- TerraFusion Sync 2.0 foundation: additive shadow path. Typed canonical tables remain the product contract.

CREATE TABLE public.sync_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id uuid NOT NULL REFERENCES public.counties(id),
  source_key text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('pacs_extract','pacs_live','gis_service','csv','public_record','api','field_capture','reference')),
  display_name text NOT NULL,
  datasets jsonb NOT NULL DEFAULT '[]'::jsonb,
  authority_scope jsonb NOT NULL DEFAULT '{}'::jsonb,
  extraction_contract jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (county_id, source_key)
);

CREATE TABLE public.sync_mapping_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id uuid NOT NULL REFERENCES public.counties(id),
  source_id uuid NOT NULL REFERENCES public.sync_sources(id),
  dataset text NOT NULL,
  version integer NOT NULL,
  status text NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed','approved','retired')),
  mappings jsonb NOT NULL DEFAULT '[]'::jsonb,
  legacy_profile_id uuid,
  proposed_by text,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_id, dataset, version)
);

CREATE TABLE public.sync_publications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id uuid NOT NULL REFERENCES public.counties(id),
  domain text NOT NULL CHECK (domain IN ('property','improvement','assessment','sale','instrument','geometry','neighborhood','ownership')),
  version integer NOT NULL,
  status text NOT NULL DEFAULT 'staging' CHECK (status IN ('staging','published','superseded','rolled_back','failed')),
  previous_publication_id uuid REFERENCES public.sync_publications(id),
  manifest_hash text,
  lineage_count integer NOT NULL DEFAULT 0,
  record_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  published_by uuid,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (county_id, domain, version)
);

CREATE TABLE public.sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id uuid NOT NULL REFERENCES public.counties(id),
  source_id uuid NOT NULL REFERENCES public.sync_sources(id),
  dataset text NOT NULL,
  batch_key text NOT NULL,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','landed','failed','completed','cancelled')),
  stage text NOT NULL DEFAULT 'land' CHECK (stage IN ('connect','land','map','resolve','validate','review','publish','verify')),
  checkpoint jsonb NOT NULL DEFAULT '{}'::jsonb,
  counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  mapping_version_id uuid REFERENCES public.sync_mapping_versions(id),
  publication_id uuid REFERENCES public.sync_publications(id),
  manifest_hash text,
  error text,
  started_by uuid,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  UNIQUE (source_id, dataset, batch_key)
);

CREATE TABLE public.sync_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id uuid NOT NULL REFERENCES public.counties(id),
  run_id uuid NOT NULL REFERENCES public.sync_runs(id),
  source_id uuid NOT NULL REFERENCES public.sync_sources(id),
  dataset text NOT NULL,
  source_record_key text NOT NULL,
  batch_key text NOT NULL,
  effective_period text NOT NULL DEFAULT '',
  replay_key text NOT NULL,
  payload jsonb NOT NULL,
  payload_hash text NOT NULL,
  landed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (replay_key)
);
CREATE INDEX idx_sync_evidence_run ON public.sync_evidence(run_id);
CREATE INDEX idx_sync_evidence_source_key ON public.sync_evidence(county_id, dataset, source_record_key);

CREATE TABLE public.sync_entity_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id uuid NOT NULL REFERENCES public.counties(id),
  entity_type text NOT NULL CHECK (entity_type IN ('property','improvement','assessment','sale','instrument')),
  source_system text NOT NULL,
  source_id text NOT NULL,
  governed_id uuid NOT NULL,
  is_alias boolean NOT NULL DEFAULT false,
  relation text NOT NULL DEFAULT 'identity' CHECK (relation IN ('identity','alias','split_from','merged_into')),
  related_governed_id uuid,
  valid_from date,
  valid_to date,
  evidence_id uuid REFERENCES public.sync_evidence(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (county_id, entity_type, source_system, source_id, relation, valid_from)
);

CREATE TABLE public.sync_assertions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id uuid NOT NULL REFERENCES public.counties(id),
  publication_id uuid REFERENCES public.sync_publications(id),
  entity_type text NOT NULL,
  governed_id uuid NOT NULL,
  field text NOT NULL,
  asserted_value jsonb,
  effective_period text NOT NULL DEFAULT '',
  derivation text NOT NULL DEFAULT 'observed' CHECK (derivation IN ('observed','aggregated','derived','calculated')),
  status text NOT NULL DEFAULT 'candidate' CHECK (status IN ('candidate','accepted','rejected','superseded')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sync_assertions_entity ON public.sync_assertions(county_id, entity_type, governed_id, field);

-- Many-to-many lineage: one observation supports many facts; one fact depends on many observations.
CREATE TABLE public.sync_assertion_evidence (
  assertion_id uuid NOT NULL REFERENCES public.sync_assertions(id),
  evidence_id uuid NOT NULL REFERENCES public.sync_evidence(id),
  county_id uuid NOT NULL REFERENCES public.counties(id),
  role text NOT NULL DEFAULT 'support',
  PRIMARY KEY (assertion_id, evidence_id)
);

CREATE TABLE public.sync_reconciliation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id uuid NOT NULL REFERENCES public.counties(id),
  conflict_type text NOT NULL CHECK (conflict_type IN ('value_mismatch','identity_ambiguous','missing_required','effective_overlap','authority_unresolved')),
  owner_domain text NOT NULL CHECK (owner_domain IN ('os','forge','atlas','dais','dossier')),
  entity_type text NOT NULL,
  governed_id uuid,
  field text,
  assertion_ids uuid[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved','dismissed')),
  decision jsonb,
  decision_evidence jsonb,
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Grants (authenticated only; no anon)
GRANT SELECT, INSERT, UPDATE ON public.sync_sources, public.sync_mapping_versions, public.sync_publications, public.sync_runs, public.sync_entity_links, public.sync_assertions, public.sync_reconciliation_items TO authenticated;
GRANT SELECT, INSERT ON public.sync_evidence, public.sync_assertion_evidence TO authenticated;
GRANT ALL ON public.sync_sources, public.sync_mapping_versions, public.sync_publications, public.sync_runs, public.sync_evidence, public.sync_entity_links, public.sync_assertions, public.sync_assertion_evidence, public.sync_reconciliation_items TO service_role;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['sync_sources','sync_mapping_versions','sync_publications','sync_runs','sync_evidence','sync_entity_links','sync_assertions','sync_assertion_evidence','sync_reconciliation_items'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "County read %1$s" ON public.%1$I FOR SELECT TO authenticated USING (county_id = public.get_user_county_id())', t);
    EXECUTE format('CREATE POLICY "County admin insert %1$s" ON public.%1$I FOR INSERT TO authenticated WITH CHECK (public.is_admin() AND county_id = public.get_user_county_id())', t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['sync_sources','sync_mapping_versions','sync_publications','sync_runs','sync_entity_links','sync_assertions','sync_reconciliation_items'] LOOP
    EXECUTE format('CREATE POLICY "County admin update %1$s" ON public.%1$I FOR UPDATE TO authenticated USING (public.is_admin() AND county_id = public.get_user_county_id()) WITH CHECK (public.is_admin() AND county_id = public.get_user_county_id())', t);
  END LOOP;
END $$;

-- Evidence and lineage links are immutable for everyone (including service role paths through triggers).
CREATE OR REPLACE FUNCTION public.sync_block_mutation()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'TerraFusion Sync: % on % is not permitted (immutable evidence)', TG_OP, TG_TABLE_NAME;
END $$;

CREATE TRIGGER trg_sync_evidence_immutable BEFORE UPDATE OR DELETE ON public.sync_evidence
  FOR EACH ROW EXECUTE FUNCTION public.sync_block_mutation();
CREATE TRIGGER trg_sync_assertion_evidence_immutable BEFORE UPDATE OR DELETE ON public.sync_assertion_evidence
  FOR EACH ROW EXECUTE FUNCTION public.sync_block_mutation();

-- Evidence may only land into a running run of the same county/source.
CREATE OR REPLACE FUNCTION public.sync_evidence_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE r record;
BEGIN
  SELECT county_id, source_id, status INTO r FROM public.sync_runs WHERE id = NEW.run_id;
  IF r IS NULL OR r.status <> 'running' THEN
    RAISE EXCEPTION 'TerraFusion Sync: evidence can only land into a running run';
  END IF;
  IF r.county_id <> NEW.county_id OR r.source_id <> NEW.source_id THEN
    RAISE EXCEPTION 'TerraFusion Sync: evidence county/source must match its run';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_sync_evidence_guard BEFORE INSERT ON public.sync_evidence
  FOR EACH ROW EXECUTE FUNCTION public.sync_evidence_guard();

-- Publication lifecycle: cannot publish without manifest + lineage; published versions are immutable except supersede/rollback status.
CREATE OR REPLACE FUNCTION public.sync_publication_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'TerraFusion Sync: publications cannot be deleted';
  END IF;
  IF TG_OP = 'INSERT' AND NEW.status <> 'staging' THEN
    RAISE EXCEPTION 'TerraFusion Sync: publications must start in staging';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status IN ('published','superseded','rolled_back') THEN
      IF NEW.manifest_hash IS DISTINCT FROM OLD.manifest_hash
         OR NEW.lineage_count <> OLD.lineage_count
         OR NEW.record_counts <> OLD.record_counts
         OR NEW.version <> OLD.version
         OR NEW.domain <> OLD.domain
         OR NEW.county_id <> OLD.county_id THEN
        RAISE EXCEPTION 'TerraFusion Sync: published publication content is immutable';
      END IF;
      IF NOT (NEW.status = OLD.status OR (OLD.status = 'published' AND NEW.status IN ('superseded','rolled_back'))) THEN
        RAISE EXCEPTION 'TerraFusion Sync: invalid status transition % -> %', OLD.status, NEW.status;
      END IF;
    END IF;
    IF OLD.status = 'failed' AND NEW.status <> 'failed' THEN
      RAISE EXCEPTION 'TerraFusion Sync: failed publications cannot be revived';
    END IF;
    IF NEW.status = 'published' AND OLD.status = 'staging' THEN
      IF NEW.manifest_hash IS NULL OR NEW.lineage_count <= 0 THEN
        RAISE EXCEPTION 'TerraFusion Sync: cannot publish without manifest hash and lineage';
      END IF;
      NEW.published_at := COALESCE(NEW.published_at, now());
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_sync_publication_guard BEFORE INSERT OR UPDATE OR DELETE ON public.sync_publications
  FOR EACH ROW EXECUTE FUNCTION public.sync_publication_guard();

-- Runs: terminal states are final.
CREATE OR REPLACE FUNCTION public.sync_run_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.status IN ('completed','failed','cancelled') AND NEW.status <> OLD.status THEN
    RAISE EXCEPTION 'TerraFusion Sync: run is in terminal state %', OLD.status;
  END IF;
  IF NEW.status IN ('completed','failed','cancelled') AND NEW.finished_at IS NULL THEN
    NEW.finished_at := now();
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_sync_run_guard BEFORE UPDATE ON public.sync_runs
  FOR EACH ROW EXECUTE FUNCTION public.sync_run_guard();

-- Read-only Benton/county inventory of current canonical records by domain with explicit cohorts.
CREATE OR REPLACE FUNCTION public.sync_canonical_inventory(p_county_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public SET statement_timeout = '30s' AS $$
DECLARE result jsonb;
BEGIN
  IF p_county_id IS DISTINCT FROM public.get_user_county_id() THEN
    RAISE EXCEPTION 'Not authorized for this county';
  END IF;
  SELECT jsonb_build_object(
    'county_id', p_county_id,
    'generated_at', now(),
    'property', (SELECT jsonb_build_object(
        'parcels_total', count(*),
        'with_building_area', count(*) FILTER (WHERE building_area > 0),
        'with_year_built', count(*) FILTER (WHERE year_built > 0),
        'with_neighborhood', count(*) FILTER (WHERE neighborhood_code IS NOT NULL),
        'with_coordinates', count(*) FILTER (WHERE latitude IS NOT NULL AND longitude IS NOT NULL))
      FROM public.parcels WHERE county_id = p_county_id),
    'assessment', (SELECT jsonb_build_object(
        'records_total', count(*),
        'certified', count(*) FILTER (WHERE certified),
        'tax_years', COALESCE(jsonb_agg(DISTINCT tax_year), '[]'::jsonb))
      FROM public.assessments WHERE county_id = p_county_id),
    'sale', (SELECT jsonb_build_object(
        'records_total', count(*),
        'with_price', count(*) FILTER (WHERE sale_price > 0),
        'earliest', min(sale_date), 'latest', max(sale_date))
      FROM public.sales WHERE county_id = p_county_id),
    'sync', jsonb_build_object(
        'sources', (SELECT count(*) FROM public.sync_sources WHERE county_id = p_county_id),
        'runs', (SELECT count(*) FROM public.sync_runs WHERE county_id = p_county_id),
        'evidence', (SELECT count(*) FROM public.sync_evidence WHERE county_id = p_county_id),
        'publications', (SELECT count(*) FROM public.sync_publications WHERE county_id = p_county_id AND status = 'published'))
  ) INTO result;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.sync_canonical_inventory(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_canonical_inventory(uuid) TO authenticated;
