
-- ============================================================
-- PHASE 0: FOUNDATION — single atomic migration
-- ============================================================

-- 1. Counties table
CREATE TABLE public.counties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fips_code text NOT NULL UNIQUE,
  name text NOT NULL,
  state text NOT NULL DEFAULT 'TX',
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.counties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view counties" ON public.counties FOR SELECT USING (true);
CREATE POLICY "Admins can manage counties" ON public.counties FOR ALL USING (is_admin()) WITH CHECK (is_admin());
CREATE TRIGGER update_counties_updated_at BEFORE UPDATE ON public.counties FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Default county
INSERT INTO public.counties (id, fips_code, name, state)
VALUES ('00000000-0000-0000-0000-000000000001', '48001', 'Default County', 'TX');

-- 3. Add county_id columns
ALTER TABLE public.parcels ADD COLUMN county_id uuid REFERENCES public.counties(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.assessments ADD COLUMN county_id uuid REFERENCES public.counties(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.sales ADD COLUMN county_id uuid REFERENCES public.counties(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.appeals ADD COLUMN county_id uuid REFERENCES public.counties(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.data_sources ADD COLUMN county_id uuid REFERENCES public.counties(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.study_periods ADD COLUMN county_id uuid REFERENCES public.counties(id) DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE public.vei_metrics ADD COLUMN county_id uuid REFERENCES public.counties(id) DEFAULT '00000000-0000-0000-0000-000000000001';

-- 4. Backfill + NOT NULL
UPDATE public.parcels SET county_id = '00000000-0000-0000-0000-000000000001' WHERE county_id IS NULL;
UPDATE public.assessments SET county_id = '00000000-0000-0000-0000-000000000001' WHERE county_id IS NULL;
UPDATE public.sales SET county_id = '00000000-0000-0000-0000-000000000001' WHERE county_id IS NULL;
UPDATE public.appeals SET county_id = '00000000-0000-0000-0000-000000000001' WHERE county_id IS NULL;
UPDATE public.data_sources SET county_id = '00000000-0000-0000-0000-000000000001' WHERE county_id IS NULL;
UPDATE public.study_periods SET county_id = '00000000-0000-0000-0000-000000000001' WHERE county_id IS NULL;
UPDATE public.vei_metrics SET county_id = '00000000-0000-0000-0000-000000000001' WHERE county_id IS NULL;

ALTER TABLE public.parcels ALTER COLUMN county_id SET NOT NULL;
ALTER TABLE public.assessments ALTER COLUMN county_id SET NOT NULL;
ALTER TABLE public.sales ALTER COLUMN county_id SET NOT NULL;
ALTER TABLE public.appeals ALTER COLUMN county_id SET NOT NULL;
ALTER TABLE public.data_sources ALTER COLUMN county_id SET NOT NULL;
ALTER TABLE public.study_periods ALTER COLUMN county_id SET NOT NULL;
ALTER TABLE public.vei_metrics ALTER COLUMN county_id SET NOT NULL;

-- 5. Composite unique
ALTER TABLE public.parcels ADD CONSTRAINT parcels_county_parcel_number_unique UNIQUE (county_id, parcel_number);

-- 6. Profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  county_id uuid REFERENCES public.counties(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Auto-create profile + role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'viewer');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. Helper function
CREATE OR REPLACE FUNCTION public.get_user_county_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT county_id FROM public.profiles WHERE user_id = auth.uid()
$$;

-- 9. Indexes
CREATE INDEX idx_parcels_county_id ON public.parcels(county_id);
CREATE INDEX idx_assessments_county_id ON public.assessments(county_id);
CREATE INDEX idx_sales_county_id ON public.sales(county_id);
CREATE INDEX idx_appeals_county_id ON public.appeals(county_id);
CREATE INDEX idx_data_sources_county_id ON public.data_sources(county_id);
CREATE INDEX idx_study_periods_county_id ON public.study_periods(county_id);
CREATE INDEX idx_vei_metrics_county_id ON public.vei_metrics(county_id);
