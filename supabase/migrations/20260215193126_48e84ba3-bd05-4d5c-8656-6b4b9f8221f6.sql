
-- ============================================================
-- TerraDossier Suite: Documents, Narratives, Packets
-- Write Owner: dossier (per Constitution)
-- ============================================================

-- 1. Documents table — files uploaded and linked to parcels
CREATE TABLE public.dossier_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parcel_id UUID NOT NULL REFERENCES public.parcels(id) ON DELETE CASCADE,
  county_id UUID NOT NULL DEFAULT public.get_user_county_id() REFERENCES public.counties(id),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size_bytes BIGINT,
  mime_type TEXT,
  document_type TEXT NOT NULL DEFAULT 'general',
  description TEXT,
  uploaded_by UUID NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.dossier_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view documents in their county"
  ON public.dossier_documents FOR SELECT
  USING (county_id = public.get_user_county_id());

CREATE POLICY "Users can upload documents"
  ON public.dossier_documents FOR INSERT
  WITH CHECK (county_id = public.get_user_county_id());

CREATE POLICY "Users can update their own documents"
  ON public.dossier_documents FOR UPDATE
  USING (uploaded_by = auth.uid());

CREATE POLICY "Users can delete their own documents"
  ON public.dossier_documents FOR DELETE
  USING (uploaded_by = auth.uid());

CREATE TRIGGER update_dossier_documents_updated_at
  BEFORE UPDATE ON public.dossier_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_dossier_documents_parcel ON public.dossier_documents(parcel_id);
CREATE INDEX idx_dossier_documents_type ON public.dossier_documents(document_type);

-- 2. Narratives table — AI-generated or manually written narratives
CREATE TABLE public.dossier_narratives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parcel_id UUID NOT NULL REFERENCES public.parcels(id) ON DELETE CASCADE,
  county_id UUID NOT NULL DEFAULT public.get_user_county_id() REFERENCES public.counties(id),
  narrative_type TEXT NOT NULL DEFAULT 'defense',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  ai_generated BOOLEAN NOT NULL DEFAULT false,
  model_used TEXT,
  created_by UUID NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.dossier_narratives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view narratives in their county"
  ON public.dossier_narratives FOR SELECT
  USING (county_id = public.get_user_county_id());

CREATE POLICY "Users can create narratives"
  ON public.dossier_narratives FOR INSERT
  WITH CHECK (county_id = public.get_user_county_id());

CREATE POLICY "Users can update their own narratives"
  ON public.dossier_narratives FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own narratives"
  ON public.dossier_narratives FOR DELETE
  USING (created_by = auth.uid());

CREATE TRIGGER update_dossier_narratives_updated_at
  BEFORE UPDATE ON public.dossier_narratives
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_dossier_narratives_parcel ON public.dossier_narratives(parcel_id);

-- 3. Packets table — assembled collections of documents + narratives
CREATE TABLE public.dossier_packets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parcel_id UUID NOT NULL REFERENCES public.parcels(id) ON DELETE CASCADE,
  county_id UUID NOT NULL DEFAULT public.get_user_county_id() REFERENCES public.counties(id),
  packet_type TEXT NOT NULL DEFAULT 'boe_defense',
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  document_ids UUID[] NOT NULL DEFAULT '{}',
  narrative_ids UUID[] NOT NULL DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  assembled_by UUID NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.dossier_packets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view packets in their county"
  ON public.dossier_packets FOR SELECT
  USING (county_id = public.get_user_county_id());

CREATE POLICY "Users can create packets"
  ON public.dossier_packets FOR INSERT
  WITH CHECK (county_id = public.get_user_county_id());

CREATE POLICY "Users can update their own packets"
  ON public.dossier_packets FOR UPDATE
  USING (assembled_by = auth.uid());

CREATE POLICY "Users can delete their own packets"
  ON public.dossier_packets FOR DELETE
  USING (assembled_by = auth.uid());

CREATE TRIGGER update_dossier_packets_updated_at
  BEFORE UPDATE ON public.dossier_packets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_dossier_packets_parcel ON public.dossier_packets(parcel_id);

-- 4. Storage bucket for dossier files
INSERT INTO storage.buckets (id, name, public)
VALUES ('dossier-files', 'dossier-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: users can upload to their own folder
CREATE POLICY "Authenticated users can upload dossier files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'dossier-files' AND auth.role() = 'authenticated');

CREATE POLICY "Users can view dossier files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'dossier-files' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own dossier files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'dossier-files' AND auth.uid()::text = (storage.foldername(name))[1]);
