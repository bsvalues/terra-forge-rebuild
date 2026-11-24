DROP POLICY IF EXISTS "Signed-in users can view counties" ON public.counties;
CREATE POLICY "Users can view their county" ON public.counties FOR SELECT TO authenticated USING (id = public.get_user_county_id() OR public.is_admin());
CREATE INDEX IF NOT EXISTS idx_gis_features_layer_county ON public.gis_features (layer_id, county_id);
DROP POLICY IF EXISTS "Signed-in users can view GIS layers" ON public.gis_layers;
CREATE POLICY "Users can view GIS layers in their county" ON public.gis_layers FOR SELECT TO authenticated USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.gis_features f WHERE f.layer_id = gis_layers.id AND f.county_id = public.get_user_county_id()));