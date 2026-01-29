-- Create table for GIS data source connections
CREATE TABLE public.gis_data_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('ftp', 'arcgis', 'file_upload')),
  connection_url TEXT,
  credentials_encrypted TEXT,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'syncing', 'success', 'error')),
  sync_error TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for imported GIS layers
CREATE TABLE public.gis_layers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data_source_id UUID REFERENCES public.gis_data_sources(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  layer_type TEXT NOT NULL CHECK (layer_type IN ('parcel', 'boundary', 'point', 'line', 'polygon')),
  file_format TEXT CHECK (file_format IN ('shapefile', 'geojson', 'csv', 'kml', 'gdb')),
  feature_count INTEGER DEFAULT 0,
  bounds JSONB,
  srid INTEGER DEFAULT 4326,
  properties_schema JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for GIS features (individual geometries)
CREATE TABLE public.gis_features (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  layer_id UUID NOT NULL REFERENCES public.gis_layers(id) ON DELETE CASCADE,
  parcel_id UUID REFERENCES public.parcels(id),
  geometry_type TEXT NOT NULL CHECK (geometry_type IN ('Point', 'LineString', 'Polygon', 'MultiPolygon')),
  coordinates JSONB NOT NULL,
  properties JSONB DEFAULT '{}',
  centroid_lat NUMERIC,
  centroid_lng NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for spatial queries
CREATE INDEX idx_gis_features_layer ON public.gis_features(layer_id);
CREATE INDEX idx_gis_features_parcel ON public.gis_features(parcel_id);
CREATE INDEX idx_gis_features_centroid ON public.gis_features(centroid_lat, centroid_lng);
CREATE INDEX idx_gis_features_geometry_type ON public.gis_features(geometry_type);

-- Enable RLS
ALTER TABLE public.gis_data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gis_layers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gis_features ENABLE ROW LEVEL SECURITY;

-- RLS Policies for gis_data_sources
CREATE POLICY "Anyone can view GIS data sources" ON public.gis_data_sources FOR SELECT USING (true);
CREATE POLICY "Admins can insert GIS data sources" ON public.gis_data_sources FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can update GIS data sources" ON public.gis_data_sources FOR UPDATE USING (is_admin());
CREATE POLICY "Admins can delete GIS data sources" ON public.gis_data_sources FOR DELETE USING (is_admin());

-- RLS Policies for gis_layers
CREATE POLICY "Anyone can view GIS layers" ON public.gis_layers FOR SELECT USING (true);
CREATE POLICY "Admins can insert GIS layers" ON public.gis_layers FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can update GIS layers" ON public.gis_layers FOR UPDATE USING (is_admin());
CREATE POLICY "Admins can delete GIS layers" ON public.gis_layers FOR DELETE USING (is_admin());

-- RLS Policies for gis_features
CREATE POLICY "Anyone can view GIS features" ON public.gis_features FOR SELECT USING (true);
CREATE POLICY "Admins can insert GIS features" ON public.gis_features FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can update GIS features" ON public.gis_features FOR UPDATE USING (is_admin());
CREATE POLICY "Admins can delete GIS features" ON public.gis_features FOR DELETE USING (is_admin());

-- Add updated_at triggers
CREATE TRIGGER update_gis_data_sources_updated_at
  BEFORE UPDATE ON public.gis_data_sources
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gis_layers_updated_at
  BEFORE UPDATE ON public.gis_layers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for GIS file uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('gis-files', 'gis-files', false);

-- Storage policies for GIS files
CREATE POLICY "Anyone can view GIS files" ON storage.objects FOR SELECT USING (bucket_id = 'gis-files');
CREATE POLICY "Admins can upload GIS files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'gis-files' AND is_admin());
CREATE POLICY "Admins can update GIS files" ON storage.objects FOR UPDATE USING (bucket_id = 'gis-files' AND is_admin());
CREATE POLICY "Admins can delete GIS files" ON storage.objects FOR DELETE USING (bucket_id = 'gis-files' AND is_admin());