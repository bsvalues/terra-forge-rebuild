DROP POLICY IF EXISTS "Authenticated users can view scrape jobs" ON public.scrape_jobs;
CREATE POLICY "Users can view own scrape jobs" ON public.scrape_jobs FOR SELECT TO authenticated USING (created_by = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Authenticated users can upload data files" ON storage.objects;
CREATE POLICY "Users can upload data files to own folder" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'data-imports' AND (storage.foldername(name))[1] = (select auth.uid()::text));

DROP POLICY IF EXISTS "Authenticated users can upload dossier files" ON storage.objects;

DROP POLICY IF EXISTS "Authenticated users can view GIS files" ON storage.objects;
CREATE POLICY "Uploaders and admins can view GIS files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'gis-files' AND (owner_id = (select auth.uid()::text) OR public.is_admin()));