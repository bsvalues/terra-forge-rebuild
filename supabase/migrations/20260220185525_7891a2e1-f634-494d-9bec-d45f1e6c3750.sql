
-- Mapping profiles: county-scoped saved column mapping templates
CREATE TABLE public.ingest_mapping_profiles (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  county_id     uuid NOT NULL DEFAULT get_user_county_id(),
  dataset_type  text NOT NULL,            -- 'parcels' | 'sales' | 'assessment_ratios'
  name          text NOT NULL,
  description   text,
  is_default    boolean NOT NULL DEFAULT false,
  created_by    uuid NOT NULL DEFAULT auth.uid(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Mapping rules: per-profile column translation rules
CREATE TABLE public.ingest_mapping_rules (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id            uuid NOT NULL REFERENCES public.ingest_mapping_profiles(id) ON DELETE CASCADE,
  source_header         text NOT NULL,   -- raw header from source file (normalized)
  target_field          text NOT NULL,   -- destination field name, '__skip__' = ignore
  confidence_override   text,            -- 'high' | 'medium' | 'low' — manual override
  transform             text,            -- optional: 'to_number' | 'to_date' | 'to_bool'
  created_at            timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ingest_mapping_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingest_mapping_rules ENABLE ROW LEVEL SECURITY;

-- Profiles: county-scoped read for all authenticated users
CREATE POLICY "Users can view mapping profiles in their county"
  ON public.ingest_mapping_profiles FOR SELECT
  USING (county_id = get_user_county_id());

-- Profiles: write restricted to data_admin role (use is_admin as proxy)
CREATE POLICY "Admins can create mapping profiles"
  ON public.ingest_mapping_profiles FOR INSERT
  WITH CHECK (county_id = get_user_county_id());

CREATE POLICY "Admins can update mapping profiles"
  ON public.ingest_mapping_profiles FOR UPDATE
  USING (county_id = get_user_county_id() AND (created_by = auth.uid() OR is_admin()));

CREATE POLICY "Admins can delete mapping profiles"
  ON public.ingest_mapping_profiles FOR DELETE
  USING (created_by = auth.uid() OR is_admin());

-- Rules: inherit access through profile ownership
CREATE POLICY "Users can view mapping rules for their county"
  ON public.ingest_mapping_rules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.ingest_mapping_profiles p
      WHERE p.id = ingest_mapping_rules.profile_id
        AND p.county_id = get_user_county_id()
    )
  );

CREATE POLICY "Users can create mapping rules for their county"
  ON public.ingest_mapping_rules FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ingest_mapping_profiles p
      WHERE p.id = ingest_mapping_rules.profile_id
        AND p.county_id = get_user_county_id()
    )
  );

CREATE POLICY "Users can update mapping rules for their county"
  ON public.ingest_mapping_rules FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.ingest_mapping_profiles p
      WHERE p.id = ingest_mapping_rules.profile_id
        AND p.county_id = get_user_county_id()
    )
  );

CREATE POLICY "Users can delete mapping rules for their county"
  ON public.ingest_mapping_rules FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.ingest_mapping_profiles p
      WHERE p.id = ingest_mapping_rules.profile_id
        AND p.county_id = get_user_county_id()
    )
  );

-- Updated_at trigger
CREATE TRIGGER update_mapping_profiles_updated_at
  BEFORE UPDATE ON public.ingest_mapping_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
