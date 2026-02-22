
ALTER TABLE public.gis_layers DROP CONSTRAINT gis_layers_file_format_check;
ALTER TABLE public.gis_layers ADD CONSTRAINT gis_layers_file_format_check
  CHECK (file_format = ANY (ARRAY['shapefile','geojson','csv','kml','gdb','arcgis_featureserver']));
