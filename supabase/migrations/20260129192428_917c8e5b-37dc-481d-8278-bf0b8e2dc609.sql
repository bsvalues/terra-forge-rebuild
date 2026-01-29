-- =====================================================
-- VEI Suite Database Schema
-- Property Assessment Data Persistence
-- =====================================================

-- 1. Create app_role enum for role-based access
CREATE TYPE public.app_role AS ENUM ('admin', 'analyst', 'viewer');

-- 2. Create user_roles table for role management
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

-- =====================================================
-- CORE VEI TABLES
-- =====================================================

-- 4. Study Periods table - defines analysis timeframes
CREATE TABLE public.study_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  target_cod DECIMAL(5,2) DEFAULT 15.0,
  target_prd_low DECIMAL(4,3) DEFAULT 0.98,
  target_prd_high DECIMAL(4,3) DEFAULT 1.03,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- 5. Parcels table - property records
CREATE TABLE public.parcels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_number TEXT NOT NULL UNIQUE,
  address TEXT NOT NULL,
  city TEXT,
  state TEXT DEFAULT 'TX',
  zip_code TEXT,
  property_class TEXT CHECK (property_class IN ('residential', 'commercial', 'industrial', 'agricultural', 'vacant')),
  land_area DECIMAL(12,2),
  building_area DECIMAL(12,2),
  year_built INTEGER,
  bedrooms INTEGER,
  bathrooms DECIMAL(3,1),
  assessed_value DECIMAL(15,2) NOT NULL,
  land_value DECIMAL(15,2),
  improvement_value DECIMAL(15,2),
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  neighborhood_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Sales table - property transactions
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id UUID REFERENCES public.parcels(id) ON DELETE CASCADE NOT NULL,
  sale_date DATE NOT NULL,
  sale_price DECIMAL(15,2) NOT NULL,
  sale_type TEXT CHECK (sale_type IN ('arm_length', 'foreclosure', 'related_party', 'estate', 'other')),
  is_qualified BOOLEAN DEFAULT true,
  grantor TEXT,
  grantee TEXT,
  deed_type TEXT,
  instrument_number TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. Assessment Ratios table - computed ratios for analysis
CREATE TABLE public.assessment_ratios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_period_id UUID REFERENCES public.study_periods(id) ON DELETE CASCADE NOT NULL,
  sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
  parcel_id UUID REFERENCES public.parcels(id) ON DELETE CASCADE NOT NULL,
  assessed_value DECIMAL(15,2) NOT NULL,
  sale_price DECIMAL(15,2) NOT NULL,
  ratio DECIMAL(8,6) GENERATED ALWAYS AS (
    CASE WHEN sale_price > 0 THEN assessed_value / sale_price ELSE NULL END
  ) STORED,
  value_tier TEXT CHECK (value_tier IN ('low', 'medium', 'high')),
  is_outlier BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (study_period_id, sale_id)
);

-- 8. Appeals table - property value appeals
CREATE TABLE public.appeals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id UUID REFERENCES public.parcels(id) ON DELETE CASCADE NOT NULL,
  study_period_id UUID REFERENCES public.study_periods(id) ON DELETE SET NULL,
  appeal_date DATE NOT NULL,
  original_value DECIMAL(15,2) NOT NULL,
  requested_value DECIMAL(15,2),
  final_value DECIMAL(15,2),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'hearing', 'resolved', 'withdrawn')),
  resolution_type TEXT CHECK (resolution_type IN ('upheld', 'reduced', 'increased', 'withdrawn', 'settled')),
  resolution_date DATE,
  hearing_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 9. VEI Metrics table - aggregated statistics per study period
CREATE TABLE public.vei_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_period_id UUID REFERENCES public.study_periods(id) ON DELETE CASCADE NOT NULL UNIQUE,
  total_sales INTEGER DEFAULT 0,
  median_ratio DECIMAL(8,6),
  mean_ratio DECIMAL(8,6),
  cod DECIMAL(8,4),
  prd DECIMAL(8,6),
  prb DECIMAL(8,6),
  low_tier_median DECIMAL(8,6),
  mid_tier_median DECIMAL(8,6),
  high_tier_median DECIMAL(8,6),
  computed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- ENABLE RLS ON ALL TABLES
-- =====================================================

ALTER TABLE public.study_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parcels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_ratios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appeals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vei_metrics ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- user_roles policies
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.is_admin());

-- study_periods policies - all authenticated can read, admins can modify
CREATE POLICY "Authenticated users can view study periods"
  ON public.study_periods FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert study periods"
  ON public.study_periods FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update study periods"
  ON public.study_periods FOR UPDATE
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can delete study periods"
  ON public.study_periods FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- parcels policies
CREATE POLICY "Authenticated users can view parcels"
  ON public.parcels FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert parcels"
  ON public.parcels FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update parcels"
  ON public.parcels FOR UPDATE
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can delete parcels"
  ON public.parcels FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- sales policies
CREATE POLICY "Authenticated users can view sales"
  ON public.sales FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert sales"
  ON public.sales FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update sales"
  ON public.sales FOR UPDATE
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can delete sales"
  ON public.sales FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- assessment_ratios policies
CREATE POLICY "Authenticated users can view assessment ratios"
  ON public.assessment_ratios FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert assessment ratios"
  ON public.assessment_ratios FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update assessment ratios"
  ON public.assessment_ratios FOR UPDATE
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can delete assessment ratios"
  ON public.assessment_ratios FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- appeals policies
CREATE POLICY "Authenticated users can view appeals"
  ON public.appeals FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert appeals"
  ON public.appeals FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update appeals"
  ON public.appeals FOR UPDATE
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can delete appeals"
  ON public.appeals FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- vei_metrics policies
CREATE POLICY "Authenticated users can view VEI metrics"
  ON public.vei_metrics FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage VEI metrics"
  ON public.vei_metrics FOR ALL
  TO authenticated
  USING (public.is_admin());

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_parcels_parcel_number ON public.parcels(parcel_number);
CREATE INDEX idx_parcels_property_class ON public.parcels(property_class);
CREATE INDEX idx_parcels_neighborhood ON public.parcels(neighborhood_code);
CREATE INDEX idx_sales_parcel_id ON public.sales(parcel_id);
CREATE INDEX idx_sales_sale_date ON public.sales(sale_date);
CREATE INDEX idx_sales_is_qualified ON public.sales(is_qualified);
CREATE INDEX idx_assessment_ratios_study_period ON public.assessment_ratios(study_period_id);
CREATE INDEX idx_assessment_ratios_value_tier ON public.assessment_ratios(value_tier);
CREATE INDEX idx_appeals_parcel_id ON public.appeals(parcel_id);
CREATE INDEX idx_appeals_status ON public.appeals(status);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_study_periods_updated_at
  BEFORE UPDATE ON public.study_periods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_parcels_updated_at
  BEFORE UPDATE ON public.parcels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sales_updated_at
  BEFORE UPDATE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_appeals_updated_at
  BEFORE UPDATE ON public.appeals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();