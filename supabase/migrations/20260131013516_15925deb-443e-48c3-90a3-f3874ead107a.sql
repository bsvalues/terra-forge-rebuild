-- Create permits table for building permit tracking
CREATE TABLE public.permits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parcel_id UUID NOT NULL REFERENCES public.parcels(id) ON DELETE CASCADE,
  permit_number TEXT NOT NULL,
  permit_type TEXT NOT NULL DEFAULT 'building',
  description TEXT,
  estimated_value NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending',
  application_date DATE NOT NULL DEFAULT CURRENT_DATE,
  issue_date DATE,
  expiration_date DATE,
  inspection_date DATE,
  inspection_status TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create exemptions table for property exemption tracking
CREATE TABLE public.exemptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parcel_id UUID NOT NULL REFERENCES public.parcels(id) ON DELETE CASCADE,
  exemption_type TEXT NOT NULL,
  exemption_amount NUMERIC,
  exemption_percentage NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending',
  application_date DATE NOT NULL DEFAULT CURRENT_DATE,
  approval_date DATE,
  expiration_date DATE,
  tax_year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  applicant_name TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.permits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exemptions ENABLE ROW LEVEL SECURITY;

-- RLS policies for permits
CREATE POLICY "Anyone can view permits" ON public.permits FOR SELECT USING (true);
CREATE POLICY "Admins can insert permits" ON public.permits FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can update permits" ON public.permits FOR UPDATE USING (is_admin());
CREATE POLICY "Admins can delete permits" ON public.permits FOR DELETE USING (is_admin());

-- RLS policies for exemptions
CREATE POLICY "Anyone can view exemptions" ON public.exemptions FOR SELECT USING (true);
CREATE POLICY "Admins can insert exemptions" ON public.exemptions FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can update exemptions" ON public.exemptions FOR UPDATE USING (is_admin());
CREATE POLICY "Admins can delete exemptions" ON public.exemptions FOR DELETE USING (is_admin());

-- Update triggers
CREATE TRIGGER update_permits_updated_at BEFORE UPDATE ON public.permits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_exemptions_updated_at BEFORE UPDATE ON public.exemptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();