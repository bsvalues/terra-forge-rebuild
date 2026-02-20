
-- Fix storage bucket access policies (retry — drop conflicts first)

-- GIS-FILES: require authentication (was open to unauthenticated users)
DROP POLICY IF EXISTS "Anyone can view GIS files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view GIS files" ON storage.objects;
CREATE POLICY "Authenticated users can view GIS files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'gis-files');

-- GIS-FILES: uploads restricted to admins
DROP POLICY IF EXISTS "Admins can upload GIS files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload GIS files" ON storage.objects;
CREATE POLICY "Admins can upload GIS files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'gis-files' AND public.is_admin());

DROP POLICY IF EXISTS "Admins can delete GIS files" ON storage.objects;
CREATE POLICY "Admins can delete GIS files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'gis-files' AND public.is_admin());

-- DOSSIER-FILES: scope to owner or admin (was any authenticated user)
DROP POLICY IF EXISTS "Users can view dossier files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own dossier files" ON storage.objects;
CREATE POLICY "Users can view their own dossier files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'dossier-files'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.is_admin()
    )
  );

DROP POLICY IF EXISTS "Users can upload dossier files" ON storage.objects;
CREATE POLICY "Users can upload dossier files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'dossier-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can delete dossier files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own dossier files" ON storage.objects;
CREATE POLICY "Users can delete their own dossier files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'dossier-files'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.is_admin()
    )
  );

-- GIS_DATA_SOURCES: remove the misleading credentials_encrypted column
ALTER TABLE public.gis_data_sources DROP COLUMN IF EXISTS credentials_encrypted;
